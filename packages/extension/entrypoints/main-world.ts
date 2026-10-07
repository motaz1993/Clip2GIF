import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { createLogger } from '@clip2gif/shared';

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

export default defineUnlistedScript(() => {
  const logger = createLogger('Main World');

  window.addEventListener('message', (event) => {
    // Only accept messages from the same frame
    if (event.source !== window) return;

    if (event.data?.type === 'GIFIT_GET_STORYBOARD') {
      let spec: string | null = null;
      let duration: number | undefined = undefined;

      // Generic video player interface check
      interface GenericWebPlayer extends HTMLElement {
        getPlayerResponse?: () => {
          storyboards?: {
            playerStoryboardSpecRenderer?: {
              spec?: string;
            };
          };
          videoDetails?: {
            lengthSeconds?: string;
          };
        };
      }

      // Check common player container instances
      const player = (document.getElementById('movie_player') ||
        document.querySelector('.html5-video-player')) as GenericWebPlayer | null;

      if (player && typeof player.getPlayerResponse === 'function') {
        try {
          const response = player.getPlayerResponse();
          if (response) {
            spec = response.storyboards?.playerStoryboardSpecRenderer?.spec || null;
            if (response.videoDetails?.lengthSeconds) {
              duration = parseInt(response.videoDetails.lengthSeconds, 10);
            }
          }
        } catch (e) {
          logger.warn('Error fetching player response API', e);
        }
      }

      // Fallback: check DOM video metadata if player response is unavailable
      if (!spec) {
        const videoElement = document.querySelector('video');
        if (videoElement && !isNaN(videoElement.duration)) {
          duration = Math.round(videoElement.duration);
        }
      }

      if (spec || duration) {
        logger.log('Extracted video player metadata in main world', {
          spec,
          duration
        });

        window.postMessage(
          {
            type: 'GIFIT_STORYBOARD_DATA',
            spec: spec || null,
            duration: duration
          },
          '*'
        );
      } else {
        logger.log('No spec or metadata found in main world context');
        window.postMessage(
          {
            type: 'GIFIT_STORYBOARD_DATA',
            spec: null
          },
          '*'
        );
      }
    }
  });
});