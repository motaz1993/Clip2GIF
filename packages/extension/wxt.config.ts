import { defineConfig } from 'wxt';
import svgrPlugin from 'vite-plugin-svgr';
import path from 'path';
import { readFileSync } from 'fs';

const rootPkg = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

const isDev = process.env.NODE_ENV !== 'production';

let extensionPages = `script-src 'self'; object-src 'self'; connect-src 'self'${isDev ? ' ws://localhost:4242/' : ''};`;

export default defineConfig({
  dev: {
    server: {
      port: 4242
    }
  },
  manifest: {
    name: 'Clip2GIF',
    version: rootPkg.version,
    description:
      'Create GIFs from any video on the web. Select a clip, adjust settings, and download instantly.',
    permissions: ['storage', 'contextMenus'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: extensionPages
    },
    web_accessible_resources: [
      {
        resources: ['main-world.js'],
        matches: ['<all_urls>']
      }
    ],
    commands: {
      'quick-gif': {
        suggested_key: {
          default: 'Alt+Shift+G',
          mac: 'Alt+Shift+G'
        },
        description: 'Quick GIF – convert using saved FPS & quality'
      }
    },
    browser_specific_settings: {
      gecko: {
        id: 'clip2gif@local',
        strict_min_version: '109.0',
        // @ts-expect-error required by Firefox AMO
        data_collection_permissions: {
          required: ['none']
        }
      }
    }
  },

  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  imports: false,
  vite: () => ({
    plugins: [svgrPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(rootPkg.version)
    },
    envDir: path.resolve(__dirname, '../../'),
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../shared/src'),
        '@clip2gif/shared': path.resolve(__dirname, '../shared/src')
      }
    }
  }),

  autoIcons: {
    baseIconPath: path.resolve(
      __dirname,
      '../shared/src/assets/clip2gif-icon.svg'
    )
  }
});
