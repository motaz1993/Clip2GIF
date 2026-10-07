import { GifConfig, GifCompleteData, VideoMetadata } from '@shared/types';

export type QuickStartMode = 'current' | 'beginning' | 'full';

export interface VideoAdapter {
  seek(timeSeconds: number): Promise<void>;
  pause(): Promise<void>;
  getMetadata(): Promise<VideoMetadata | null>;
  captureFrame(): Promise<string | null>;
  getStoryboardSpec?(): Promise<unknown>;
}

export interface GifAdapter {
  createGif(config: GifConfig): Promise<void>;
  abortGif(): void;
  reset(): void;
  setCallbacks(callbacks: GifProgressCallbacks): void;
  destroy?(): void;
}

export interface StorageAdapter {
  getWidth(): Promise<number | null>;
  setWidth(value: number): Promise<void>;
  getFps(): Promise<number | null>;
  setFps(value: number): Promise<void>;
  getQuality(): Promise<number | null>;
  setQuality(value: number): Promise<void>;
  getQuickStartMode(): Promise<QuickStartMode>;
  setQuickStartMode(value: QuickStartMode): Promise<void>;
  getQuickDuration(): Promise<number>;
  setQuickDuration(value: number): Promise<void>;
}

export interface GifProgressCallbacks {
  onProgress: (
    progress: number,
    frameCount: number,
    frameDataUrl?: string,
    stage?: string
  ) => void;
  onComplete: (data: GifCompleteData) => void;
  onError: (error: string) => void;
}

export interface AnalyticsProvider {
  track(event: string, properties?: Record<string, unknown>): void;
  identify(distinctId: string, properties?: Record<string, unknown>): void;
}
