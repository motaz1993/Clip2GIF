import { useState, useCallback, useEffect } from 'react';
import { browser } from 'wxt/browser';

import Clip2GIFLogo from '@clip2gif/shared/assets/clip2gif-logo.svg?react';
import Clip2GIFIcon from '@clip2gif/shared/assets/clip2gif-icon.svg?react';

import css from './MigrationNotice.module.css';

const STORAGE_KEY = 'clip2gif:show_v4_migration_notice';

/**
 * One-time notice for users upgrading from v3 → v4.
 * Informs them that the in-page button has been replaced
 * with the browser toolbar icon.
 *
 * Only appears when the background script has flagged a
 * v3 → v4 upgrade via `browser.storage.sync`.
 */
export function MigrationNotice(): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // Show only if the background script flagged a v3 → v4 upgrade
  useEffect(() => {
    const checkShouldShow = async (): Promise<void> => {
      try {
        const result = await browser.storage.sync.get(STORAGE_KEY);
        if (result[STORAGE_KEY] === true) {
          setVisible(true);
        }
      } catch {
        console.error(
          'Clip2GIF: Could not get migration notice state from storage'
        );
      }
    };

    checkShouldShow();
  }, []);

  const handleDismiss = useCallback(async () => {
    setDismissing(true);

    try {
      await browser.storage.sync.remove(STORAGE_KEY);
    } catch {
      console.error('Clip2GIF: Could not clear migration notice from storage');
    }

    // Wait for exit animation before unmounting
    setTimeout(() => {
      setVisible(false);
    }, 300);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={css.notice}
      role="status"
      aria-live="polite"
      data-dismissed={dismissing || undefined}>
      <header className={css.header}>
        <Clip2GIFLogo className={css.logo} aria-label="Clip2GIF logo" />
        has moved!
      </header>
      <main className={css.body}>
        <p>
          You can now launch Clip2GIF from the{' '}
          <strong className={css.highlight}>
            toolbar icon{' '}
            <Clip2GIFIcon className={css.icon} aria-label="Clip2GIF icon" />
          </strong>{' '}
          in your browser. Look for the Clip2GIF icon in your extensions toolbar.
        </p>
        <p>
          {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <a
            href="https:///blog/clip2gif-v4"
            target="_blank"
            rel="noopener">
            Why did the extension move?
          </a>
        </p>
      </main>
      <button
        className={css.dismiss}
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss migration notice">
        Got it
      </button>
    </div>
  );
}
