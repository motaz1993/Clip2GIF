import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import ReactDOM from 'react-dom/client';
import {
  GifService,
  createLogger,
  ExtensionMessage,
  findBestVideo
} from '@clip2gif/shared';

const logger = createLogger('Content');

// MigrationNotice disabled for Clip2GIF

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async main(ctx: any) {
    logger.log('Running content script');

    // Migration notice removed for Clip2GIF v1

    let activeVideoElement: HTMLVideoElement | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let activePopupPort: any = null;
    const gifService = new GifService();

    /**
     * securely gets the video element, ensuring it is connected to the DOM.
     * Uses findBestVideo to select the most prominent visible video.
     */
    const getVideoElement = (): HTMLVideoElement | null => {
      const allVideos = document.querySelectorAll('video');
      const bestVideo = findBestVideo(allVideos);

      if (bestVideo) {
        if (activeVideoElement !== bestVideo) {
          logger.log('Found new best video element', bestVideo);
        }
        activeVideoElement = bestVideo;
        return activeVideoElement;
      }

      logger.log('No suitable video element found');
      return null;
    };

    // --- Mutation Observer ---
    // Watch for new video elements appearing in the DOM (e.g. SPA navigation)
    const observer = new MutationObserver((mutations) => {
      let foundNew = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLVideoElement) {
            foundNew = true;
            break;
          }
          if (node instanceof Element) {
            if (node.querySelector('video')) {
              foundNew = true;
              break;
            }
          }
        }
        if (foundNew) break;
      }

      if (foundNew) {
        logger.log('New video element detected in DOM via MutationObserver');
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // --- Service Event Listeners ---
    gifService.on(
      'FRAMES_PROGRESS',
      (progress, frameCount, frameDataUrl, stage) => {
        browser.runtime
          .sendMessage({
            type: 'GIF_PROGRESS',
            progress,
            frameCount,
            frameDataUrl,
            stage
          })
          .catch((error: unknown) => {
            logger.error('Failed to send GIF_PROGRESS message:', error);
          });
      }
    );

    gifService.on('COMPLETE', (data) => {
      browser.runtime
        .sendMessage({ type: 'GIF_COMPLETE', data })
        .catch((error: unknown) => {
          logger.log('Failed to send GIF_COMPLETE message:', error);
        });
    });

    gifService.on('ERROR', (error) => {
      browser.runtime
        .sendMessage({ type: 'GIF_ERROR', error: error.message })
        .catch((error: unknown) => {
          logger.log('Failed to send GIF_ERROR message:', error);
        });
    });

    // --- Storyboards ---

    // Listen for messages from the page (the injected script response)
    window.addEventListener('message', (event) => {
      // Only accept messages from same frame
      if (event.source !== window) return;

      if (event.data.type === 'PLAYER_RESPONSE') {
        logger.log('Received player response from page', event.data.payload);
      }
    });

    const getStoryboardSpecFromPage = (): Promise<string | null> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 10;
        let intervalId: NodeJS.Timeout;

        const handleResponse = (event: MessageEvent) => {
          if (event.source !== window) return;

          // Ignore our own request messages
          if (event.data?.type === 'GIFIT_GET_STORYBOARD') return;

          if (event.data?.type === 'GIFIT_STORYBOARD_DATA') {
            window.removeEventListener('message', handleResponse);
            clearInterval(intervalId);

            const { spec, duration } = event.data;
            const currentVideo = getVideoElement();

            // Validate duration if available
            if (duration && currentVideo) {
              const videoDuration = Math.round(currentVideo.duration);
              const storyboardDuration = parseInt(duration, 10);

              // Allow small variance (e.g. 2 seconds)
              if (Math.abs(videoDuration - storyboardDuration) > 2) {
                console.warn(
                  `Content: Duration mismatch. Video: ${videoDuration}s, Storyboard: ${storyboardDuration}s. Ignoring spec.`
                );
                resolve(null);
                return;
              }
            }

            resolve(spec || null);
          }
        };

        window.addEventListener('message', handleResponse);

        const injectAndPoll = async () => {
          try {
            const scriptUrl = browser.runtime.getURL('/main-world.js');
            const existingScript = document.querySelector(
              `script[src="${scriptUrl}"]`
            );

            if (!existingScript) {
              const script = document.createElement('script');
              script.src = scriptUrl;
              script.onload = () => {
                logger.log('Content: main-world.js loaded successfully');
              };
              script.onerror = (e) => {
                console.error('Content: Failed to load main-world.js', e);
              };
              (document.head || document.documentElement).appendChild(script);
              logger.log('Content: Injected main-world.js via script src');
            } else {
              logger.log('Content: main-world.js already injected');
            }
          } catch (e) {
            console.error('Content: Failed to inject main-world.js', e);
          }

          const sendRequest = () => {
            attempts++;
            logger.log(
              `Content: Sending GIFIT_GET_STORYBOARD (Attempt ${attempts}/${maxAttempts})`
            );
            window.postMessage({ type: 'GIFIT_GET_STORYBOARD' }, '*');

            if (attempts >= maxAttempts) {
              clearInterval(intervalId);
              window.removeEventListener('message', handleResponse);
              console.warn(
                'Content: Max attempts reached waiting for storyboard data'
              );
              resolve(null);
            }
          };

          // Send immediately, then poll
          sendRequest();
          intervalId = setInterval(sendRequest, 500);
        };

        injectAndPoll();
      });
    };

    // --- Message Listener ---
    // Use sendResponse callback pattern which works for both Chrome and Firefox
    // when using the browser polyfill from wxt/browser
    browser.runtime.onMessage.addListener(
      (
        message: ExtensionMessage,
        _sender: unknown,
        sendResponse: (response?: unknown) => void
      ): true | undefined => {
        logger.log('Content Script received message:', message.type);

        if (message.type === 'START_GIF') {
          const video = getVideoElement();
          if (!video) {
            logger.log('No active video element found to start GIF');
            sendResponse({ success: false, error: 'No video found' });
            return;
          }
          gifService.createGif(message.config, video);
          sendResponse({ success: true });
          return;
        }

        // Quick GIF – fully driven by user settings
        if ((message as any).type === 'QUICK_GIF') {
          const video = getVideoElement();
          if (!video) {
            sendResponse({ success: false, error: 'No video found' });
            return;
          }
          const cfg = (message as any).config || {};
          const startMode = cfg.startMode || 'current';
          const durationMs = typeof cfg.durationMs === 'number' ? cfg.durationMs : 0;
          const videoDurationMs = Math.floor((video.duration || 0) * 1000);

          let startMs = 0;
          let endMs = videoDurationMs;

          if (startMode === 'full') {
            startMs = 0;
            endMs = videoDurationMs;
          } else if (startMode === 'beginning') {
            startMs = 0;
            endMs = durationMs > 0
              ? Math.min(durationMs, videoDurationMs)
              : videoDurationMs;
          } else {
            // 'current'
            startMs = Math.floor(video.currentTime * 1000);
            endMs = durationMs > 0
              ? Math.min(startMs + durationMs, videoDurationMs)
              : videoDurationMs;
          }

          // Safety: need at least a short clip
          if (endMs - startMs < 100) {
            endMs = Math.min(startMs + 1000, videoDurationMs);
          }

          const aspect = video.videoHeight / (video.videoWidth || 1);
          const width = cfg.width ?? 420;
          const height = Math.round(width * aspect);

          const quickConfig = {
            name: 'clip2gif-quick',
            quality: cfg.quality ?? 5,
            width,
            height,
            start: startMs,
            end: endMs,
            fps: cfg.fps ?? 10
          };

          const onComplete = (data: any) => {
            gifService.off('COMPLETE', onComplete);
            try {
              const a = document.createElement('a');
              a.href = data.dataUrl;
              a.download = `clip2gif-${Date.now()}.gif`;
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (e) {
              logger.error('Auto-download failed', e);
            }
          };
          gifService.on('COMPLETE', onComplete);
          gifService.createGif(quickConfig, video);
          sendResponse({ success: true });
          return;
        }

        if (message.type === 'STOP_GIF') {
          gifService.abort();
          sendResponse({ success: true });
          return;
        }

        if (message.type === 'GET_VIDEO_METADATA') {
          logger.log('Handling GET_VIDEO_METADATA');
          const video = getVideoElement();

          if (video) {
            // Check if metadata is loaded
            if (video.readyState < 1) {
              logger.log('Video metadata not loaded yet (readyState < 1)');
              sendResponse(null);
              return;
            }

            logger.log('Selected video element:', video);
            logger.log(
              `Video details: id="${video.id}", class="${video.className}", src="${video.currentSrc}"`
            );

            const metadata = {
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              currentTime: video.currentTime
            };
            logger.log('Returning video metadata:', metadata);
            sendResponse(metadata);
            return;
          }
          logger.log('No video found for GET_VIDEO_METADATA');
          sendResponse(null);
          return;
        }

        if (message.type === 'SEEK_VIDEO') {
          const video = getVideoElement();

          if (video) {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              // Wait for the next frame to be painted
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  sendResponse(true);
                });
              });
            };
            video.addEventListener('seeked', onSeeked, { once: true });
            // Safety timeout
            setTimeout(() => {
              video.removeEventListener('seeked', onSeeked);
              sendResponse(true);
            }, 2000);

            video.currentTime = message.time;
            return true; // Keep channel open for async response
          }
          sendResponse(false);
          return;
        }

        if (message.type === 'PAUSE_VIDEO') {
          const video = getVideoElement();
          if (video) {
            video.pause();
            sendResponse(true);
            return;
          }
          sendResponse(false);
          return;
        }

        if (message.type === 'CAPTURE_VISIBLE_FRAME') {
          const video = getVideoElement();
          if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              sendResponse(canvas.toDataURL());
              return;
            }
          }
          sendResponse(null);
          return;
        }

        if (message.type === 'GET_STORYBOARD') {
          getStoryboardSpecFromPage()
            .then((spec) => {
              sendResponse({ spec });
            })
            .catch((error) => {
              logger.log('Error fetching storyboard:', error);
              sendResponse({ spec: null });
            });
          return true; // Keep channel open for async response
        }

        // Return undefined for messages we don't handle
        return undefined;
      }
    );

    // --- Port Listener (Popup Lifecycle) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    browser.runtime.onConnect.addListener((port: any) => {
      if (port.name === 'GIFIT_POPUP_CONTEXT') {
        activePopupPort = port;
        logger.log('Popup connected, enforcing video pause');
        const video = getVideoElement();
        if (!video) return;

        const enforcePause = () => {
          if (!video.paused) {
            logger.log(
              'Video tried to play while popup is open, pausing again'
            );
            video.pause();
          }
        };

        // Initial pause
        video.pause();

        // Enforce pause if the user/site tries to play
        video.addEventListener('play', enforcePause);
        video.addEventListener('playing', enforcePause);

        port.onDisconnect.addListener(() => {
          logger.log('Popup disconnected, releasing video control');
          activePopupPort = null;
          video.removeEventListener('play', enforcePause);
          video.removeEventListener('playing', enforcePause);
        });
      }
    });
  }
});