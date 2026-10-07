import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { createLogger } from '@clip2gif/shared';
import { storedConfig } from '@clip2gif/shared/utils/extensionStorage';

function getExtensionAction() {
  const legacyBrowser = browser as unknown as {
    browserAction?: typeof browser.action;
  };
  return browser.action || legacyBrowser.browserAction;
}

const logger = createLogger('Background');
const CONTEXT_MENU_ID = 'clip2gif:create-gif';
const QUICK_MENU_ID = 'clip2gif:quick-gif';

async function runQuickGif(tabId: number) {
  const [w, f, q, startMode, duration] = await Promise.all([
    Promise.resolve(420),
    storedConfig.fps.getValue(),
    storedConfig.quality.getValue(),
    storedConfig.quickStartMode.getValue(),
    storedConfig.quickDuration.getValue()
  ]);

  await browser.tabs.sendMessage(tabId, {
    type: 'QUICK_GIF',
    config: {
      width: 420, // per-video; not persisted
      fps: f ?? 10,
      quality: q ?? 5,
      startMode: startMode ?? 'current',
      durationMs: duration ?? 0
    }
  });
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Create GIF…',
      contexts: ['page', 'video'],
      documentUrlPatterns: ['<all_urls>']
    });
    browser.contextMenus.create({
      id: QUICK_MENU_ID,
      title: 'Quick GIF',
      contexts: ['page', 'video'],
      documentUrlPatterns: ['<all_urls>']
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    if (info.menuItemId === CONTEXT_MENU_ID) {
      const action = getExtensionAction();
      if (action?.openPopup) {
        action.openPopup().catch((err: unknown) => {
          logger.error('Failed to open popup', err);
        });
      }
      return;
    }

    if (info.menuItemId === QUICK_MENU_ID) {
      try {
        await runQuickGif(tab.id);
      } catch (err) {
        logger.error('Quick GIF failed', err);
      }
    }
  });

  // Keyboard shortcut: Alt+Shift+G → Quick GIF
  // (Toolbar Shift/Ctrl+click is not available when a popup is attached)
  browser.commands?.onCommand.addListener(async (command) => {
    if (command !== 'quick-gif') return;
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      if (tab?.id) await runQuickGif(tab.id);
    } catch (err) {
      logger.error('Quick GIF command failed', err);
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      updateActionState(tabId);
    }
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {
    updateActionState(activeInfo.tabId);
  });
});

function updateActionState(tabId: number | undefined) {
  if (!tabId) return;
  const action = getExtensionAction();
  if (action?.enable) action.enable(tabId);
  browser.contextMenus
    .update(CONTEXT_MENU_ID, { enabled: true })
    .catch(() => {});
  browser.contextMenus.update(QUICK_MENU_ID, { enabled: true }).catch(() => {});
}
