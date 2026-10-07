# Clip2GIF

**Create GIFs from any video on the web — in one click.**

Clip2GIF is a browser extension that turns any video on any website into a high-quality GIF. Select a clip, adjust settings, and download — or use **Quick GIF** for instant conversion with your saved presets.

Works on YouTube, Twitter/X, Vimeo, Twitch, Facebook, local video files, and essentially any page that uses a standard `<video>` element.

---

## Features

- **Works on all websites** — not limited to a single platform
- Full editor with timeline, start time, duration, width, FPS, and quality
- **Quick GIF** — right-click the page → “Quick GIF”, or press **Alt+Shift+G**
- Fully editable Quick defaults (start mode + duration)
- **FPS and quality are remembered** between videos (width, height, and duration stay per-video)
- Supports **Firefox**, **Chrome**, **Edge**, **Brave**, **Opera**, and other Chromium browsers
- 100% local processing — nothing is uploaded

---

## Install

### From Releases (recommended)

Download the latest ZIP for your browser from the [Releases](../../releases) page.

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `manifest.json` inside the unzipped folder

**Chrome / Edge / Brave / Opera**
1. Open `chrome://extensions` (or the equivalent page)
2. Enable **Developer mode**
3. Click **Load unpacked** and select the unzipped folder

### Build from source

```bash
npm install
npm run extension:build:firefox   # Firefox
npm run extension:build           # Chrome / Chromium
npm run extension:zip:firefox
npm run extension:zip
```

Built packages appear in `packages/extension/.output/`.

---

## How to use

1. Open any page with a video.
2. **Full editor:** click the Clip2GIF toolbar icon, or right-click the page → **Create GIF…**
3. **Quick mode:**
   - Right-click the page → **Quick GIF**, or
   - Press **Alt+Shift+G**
4. In the popup, set **FPS** and **quality** once — they are saved automatically for every next video.
5. Width, height, start time, and duration are chosen per video (they do not stick).

---

## Keyboard shortcut

| Action | Default shortcut |
|--------|------------------|
| Quick GIF | **Alt+Shift+G** |

### Change the shortcut

**Firefox**
1. Open the menu → **Add-ons and themes** (`about:addons`)
2. Click the gear icon → **Manage Extension Shortcuts**
3. Find **Clip2GIF** → **Quick GIF** and set your preferred keys

**Chrome / Edge / Brave**
1. Open `chrome://extensions/shortcuts` (or `edge://extensions/shortcuts`)
2. Find **Clip2GIF** → **Quick GIF** and set your preferred keys

---

## Quick GIF defaults

| Setting | Options |
|---------|---------|
| Start from | Current time · Beginning of video · Entire video |
| Duration | Any number of seconds, or **0 = until end of video** |

Saved **FPS** and **quality** are always used for Quick GIFs. Width is taken from your last editor choice only when available; otherwise a sensible default is used per video.

---

## Project structure

```
├── packages/
│   ├── extension/     # Browser extension (WXT)
│   └── shared/        # Shared React UI, GIF engine, stores
├── package.json
├── LICENSE
└── README.md
```

---

## Credits & history

Clip2GIF is based on the excellent open-source project **[GIFit](https://github.com/takempf/GIFit)** by **Timothy Kempf**, released under the MIT License.

The original GIFit made creating GIFs from web videos simple and reliable. This project builds on that foundation:

- Extended to work on **all websites** (beyond a single platform)
- Rebranded as Clip2GIF with a refreshed look
- Added **Quick GIF** mode (context menu + **Alt+Shift+G**, shortcut is user-editable)
- FPS and quality persist across videos
- Multi-browser packaging for easier distribution
- Privacy-focused (no analytics)

All credit for the core architecture, GIF encoding approach (gifenc), video detection, and original UX goes to Timothy Kempf and contributors.

---

## Support

If Clip2GIF is useful to you, you can support continued development:

**[Buy me a coffee](https://buymeacoffee.com/touched)** ☕

Author: [github.com/motaz1993](https://github.com/motaz1993)

---

## License

MIT License — see [LICENSE](LICENSE)

This project includes code derived from GIFit (Copyright © 2014 Timothy Kempf), also under the MIT License.
