import { storage } from 'wxt/utils/storage';

export const width = storage.defineItem<number>('local:configWidth', {
  fallback: 420
});
export const fps = storage.defineItem<number>('local:configFps', {
  fallback: 10
});
export const quality = storage.defineItem<number>('local:configQuality', {
  fallback: 5
});

/**
 * Quick GIF start behaviour:
 * - 'current'   → start at current playback time
 * - 'beginning' → start at 0
 * - 'full'      → entire video (ignores duration)
 */
export type QuickStartMode = 'current' | 'beginning' | 'full';

export const quickStartMode = storage.defineItem<QuickStartMode>(
  'local:quickStartMode',
  { fallback: 'current' }
);

/**
 * Duration in milliseconds for Quick GIFs.
 * Used when start mode is 'current' or 'beginning'.
 * Set to 0 to mean "until end of video".
 */
export const quickDuration = storage.defineItem<number>('local:quickDuration', {
  fallback: 0 // 0 = until end of video (most flexible default)
});

export const storedConfig = {
  width,
  fps,
  quality,
  quickStartMode,
  quickDuration
};
