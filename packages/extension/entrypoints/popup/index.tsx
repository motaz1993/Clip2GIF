import '@clip2gif/shared/style.css';
import './style.css';

import ReactDOM from 'react-dom/client';
import { AdapterContext } from '@clip2gif/shared/adapters/context';
import { App } from '@clip2gif/shared/components/App';
import {
  ExtensionVideoAdapter,
  ExtensionGifAdapter,
  ExtensionStorageAdapter,
  getExtensionVideoTitle,
  setupPopupPort
} from '@clip2gif/shared/adapters/extension';
import { videoController } from '@clip2gif/shared/services/VideoController';
import { storageAdapter } from '@clip2gif/shared/utils/storage';
import { useConfigurationPanelStore } from '@clip2gif/shared/features/editor/stores/configurationPanelStore';
import { extensionAnalyticsProvider } from '../../lib/analytics';

// Initialize adapters
const videoAdapter = new ExtensionVideoAdapter();
const gifAdapter = new ExtensionGifAdapter();
const storageAdapterImpl = new ExtensionStorageAdapter();

// Inject into services (proxies)
// Note: videoController is now a proxy instance exported as 'videoController'
// storageAdapter is now a proxy instance exported as 'storageAdapter'
videoController.setAdapter(videoAdapter);
storageAdapter.setAdapter(storageAdapterImpl);

// Reload config now that the proxy is properly attached for the extension popup.
// The store calls loadInitialConfig() at module-eval time, before the adapter is
// wired up, so it always reads defaults on first run. This call fixes that.
useConfigurationPanelStore.getState().loadInitialConfig();

// Setup popup port connection
setupPopupPort();

const adapters = {
  video: videoAdapter,
  gif: gifAdapter,
  storage: storageAdapterImpl,
  analytics: extensionAnalyticsProvider,
  getVideoTitle: getExtensionVideoTitle
};

extensionAnalyticsProvider.track('popup_opened');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AdapterContext.Provider value={adapters}>
    <App />
  </AdapterContext.Provider>
);
