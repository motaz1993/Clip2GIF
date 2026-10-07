import { browser } from 'wxt/browser';
import type {
  VideoAdapter,
  GifAdapter,
  StorageAdapter,
  GifProgressCallbacks
} from './types';
import type { GifConfig, VideoMetadata, ExtensionMessage } from '@shared/types';
import { createLogger } from '@shared/utils/logger';

const logger = createLogger('ExtensionAdapter');

import { storedConfig } from '@shared/utils/extensionStorage';

// --- Helpers ---

async function getActiveTabId(): Promise<number | undefined> {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  if (tabs.length > 0) {
    return tabs[0]?.id;
  }

  const fallbackTabs = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true
  });
  return fallbackTabs[0]?.id;
}

async function sendMessageToActiveTab(
  type: string,
  payload?: Record<string, unknown>
): Promise<unknown> {
  const id = await getActiveTabId();
  if (id) {
    try {
      const tabInfo = await browser.tabs.get(id);
      logger.log(
        `Sending ${type} to tab ${id} (${tabInfo?.title ?? 'unknown'})`
      );
      const response = await browser.tabs.sendMessage(id, {
        type,
        ...payload
      });
      return response;
    } catch (error) {
      logger.log('Failed to send message to active tab:', error);
      return null;
    }
  }
  return null;
}

/**
 * Gets the current tab's title or fallback string.
 */
export async function getExtensionVideoTitle(): Promise<string | null> {
  const id = await getActiveTabId();
  if (id) {
    try {
      const tabInfo = await browser.tabs.get(id);
      return tabInfo?.title ?? null;
    } catch (error) {
      logger.log('Failed to fetch tab title:', error);
    }
  }
  return null;
}

/**
 * Establishes or manages port connection for popup communication.
 */
export function setupPopupPort(onMessage?: (msg: ExtensionMessage) => void) {
  try {
    const port = browser.runtime.connect({ name: 'popup' });
    if (onMessage) {
      port.onMessage.addListener(onMessage);
    }
    return port;
  } catch (error) {
    logger.log('Failed to setup popup port:', error);
    return null;
  }
}

// --- Video Adapter ---

export class ExtensionVideoAdapter implements VideoAdapter {
  async seek(timeSeconds: number): Promise<void> {
    await sendMessageToActiveTab('SEEK_VIDEO', { time: timeSeconds });
  }

  async pause(): Promise<void> {
    await sendMessageToActiveTab('PAUSE_VIDEO');
  }

  async getMetadata(): Promise<VideoMetadata | null> {
    return (await sendMessageToActiveTab(
      'GET_VIDEO_METADATA'
    )) as VideoMetadata | null;
  }

  async captureFrame(): Promise<string | null> {
    return (await sendMessageToActiveTab('CAPTURE_VISIBLE_FRAME')) as
      | string
      | null;
  }

  async getStoryboardSpec(): Promise<unknown> {
    const response = await sendMessageToActiveTab('GET_STORYBOARD');
    return (response as { spec?: unknown })?.spec;
  }
}

// --- GIF Adapter ---

export class ExtensionGifAdapter implements GifAdapter {
  private callbacks: GifProgressCallbacks | null = null;
  private messageListener: ((message: ExtensionMessage) => void) | null = null;

  setCallbacks(callbacks: GifProgressCallbacks) {
    this.callbacks = callbacks;

    // Remove old listener if any
    if (this.messageListener) {
      browser.runtime.onMessage.removeListener(this.messageListener);
    }

    // Listen for progress messages from content script
    this.messageListener = (message: ExtensionMessage) => {
      if (message.type === 'GIF_PROGRESS') {
        this.callbacks?.onProgress(
          message.progress,
          message.frameCount,
          message.frameDataUrl,
          message.stage
        );
      } else if (message.type === 'GIF_COMPLETE') {
        this.callbacks?.onComplete(message.data);
      } else if (message.type === 'GIF_ERROR') {
        this.callbacks?.onError(message.error);
      }
    };

    browser.runtime.onMessage.addListener(this.messageListener);
  }

  async createGif(config: GifConfig): Promise<void> {
    await sendMessageToActiveTab('START_GIF', { config });
  }

  abortGif(): void {
    sendMessageToActiveTab('STOP_GIF');
  }

  reset(): void {
    sendMessageToActiveTab('STOP_GIF');
  }

  destroy() {
    if (this.messageListener) {
      browser.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }
    this.callbacks = null;
  }
}

// --- Storage Adapter ---

export class ExtensionStorageAdapter implements StorageAdapter {
  async getWidth(): Promise<number | null> {
    return storedConfig.width.getValue();
  }
  async setWidth(value: number): Promise<void> {
    await storedConfig.width.setValue(value);
  }
  async getFps(): Promise<number | null> {
    return storedConfig.fps.getValue();
  }
  async setFps(value: number): Promise<void> {
    await storedConfig.fps.setValue(value);
  }
  async getQuality(): Promise<number | null> {
    return storedConfig.quality.getValue();
  }
  async setQuality(value: number): Promise<void> {
    await storedConfig.quality.setValue(value);
  }
  async getQuickStartMode(): Promise<'current' | 'beginning' | 'full'> {
    return (await storedConfig.quickStartMode.getValue()) ?? 'current';
  }
  async setQuickStartMode(value: 'current' | 'beginning' | 'full'): Promise<void> {
    await storedConfig.quickStartMode.setValue(value);
  }
  async getQuickDuration(): Promise<number> {
    return (await storedConfig.quickDuration.getValue()) ?? 0;
  }
  async setQuickDuration(value: number): Promise<void> {
    await storedConfig.quickDuration.setValue(value);
  }
  async getSpeed(): Promise<number | null> {
    return null;
  }
  async setSpeed(value: number): Promise<void> {}
}