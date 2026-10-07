import type { AnalyticsProvider } from '@clip2gif/shared/adapters/types';

/** No-op analytics – privacy first */
export const extensionAnalyticsProvider: AnalyticsProvider = {
  track() {},
  identify() {}
};
