# X Feed Filter

A browser extension by Vishal Raghav that hides posts in your X (Twitter) "For You" feed unless they match your own keywords. It comes with an aviation keyword list by default, and you can replace it with any topic.

Live URL: none. You install it from this repo's [Releases](https://github.com/vishalraghav0290/x-feed-filter/releases) page.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4)

## Features

- Hides "For You" posts whose text doesn't contain any of your keywords.
- Ships with an aviation keyword preset (airlines, aircraft types, airports, regulators, Indian Air Force and more).
- Edit the keyword list in the popup. Separate keywords with commas; multi-word phrases work.
- Whole-word, case-insensitive matching, so `atc` does not match "watch".
- Two hide modes: collapse and dim (default), or remove completely.
- Only runs on `x.com/home` with the "For You" tab selected. The Following tab, profiles, search and other pages are left alone.
- An on-page badge shows how many posts were kept and hidden. Click it to turn the filter on or off.
- "Reset to aviation preset" button restores the default list.
- Settings are saved with `chrome.storage.sync`.

## Tech stack

| Part | Details |
|---|---|
| Language | TypeScript 7.0.2 (compiled with `tsc` in strict mode, target ES2020) |
| Extension platform | Chrome Extension Manifest V3 |
| Type definitions | @types/chrome 0.3.4 |
| Build tooling | npm scripts + a small Node script (`scripts/build.mjs`) |
| Runtime dependencies | none |

## Getting started

### Install the ready-made build (no tools needed)

1. Download `x-feed-filter-v1.0.1.zip` from the [latest release](https://github.com/vishalraghav0290/x-feed-filter/releases/latest).
2. Unzip it to a folder you will keep.
3. Open `chrome://extensions` (Edge: `edge://extensions`).
4. Turn on **Developer mode**.
5. Click **Load unpacked** and pick the unzipped folder (the one containing `manifest.json`).
6. Open [x.com/home](https://x.com/home) and select **For You**.

### Build from source

Prerequisites: Node.js 16.20.0 or newer (required by TypeScript 7.0.2) and npm.

```bash
git clone https://github.com/vishalraghav0290/x-feed-filter.git
cd x-feed-filter
npm install
npm run build
```

Then load the generated `dist/` folder with **Load unpacked** as shown above.

Type-check without building:

```bash
npm run typecheck
```

There is no dev server or watch mode. After editing code, run `npm run build` again and click the reload icon on the extension card in `chrome://extensions`.

## Environment variables

None. The project has no `.env` file and needs no configuration.

## Project structure

```text
src/
  keywords.ts    default aviation keyword list, settings type, keyword resolution
  content.ts     content script that runs on x.com and hides non-matching posts
  popup.ts       logic for the settings popup
public/
  manifest.json  Manifest V3 config (permissions, content scripts, popup, icons)
  popup.html     popup markup and styles
  icon48.png, icon128.png
scripts/
  build.mjs      cleans dist/ and copies public/ into it around the tsc compile
dist/            build output (not committed); load this folder in the browser
```

## How it works

The browser injects `keywords.js` and then `content.js` into every `x.com` and `twitter.com` page. The content script reads your settings from `chrome.storage.sync` and turns each keyword into a whole-word, case-insensitive regular expression. A `MutationObserver`, plus a light 2-second safety interval, scans new `<article>` posts while you are on the "For You" tab. Each post is marked as kept or hidden, and hidden posts are either collapsed and dimmed or set to `display: none`. The popup writes changes back to `chrome.storage.sync`, and the content script picks them up through `chrome.storage.onChanged` and re-scans immediately.

## Permissions

- `storage`: to save your on/off state, hide mode and keyword list.
- Host access to `https://x.com/*` and `https://twitter.com/*`: to read post text and hide posts on those sites.

The code makes no network requests.

## Deployment

There is no store listing or CI pipeline. Releases are published manually as a zip of `dist/` on [GitHub Releases](https://github.com/vishalraghav0290/x-feed-filter/releases).

## Credits

- Built with [TypeScript](https://www.typescriptlang.org/) (Apache-2.0) and [@types/chrome](https://www.npmjs.com/package/@types/chrome) (MIT). Both are development tools only and are not bundled into the extension.
- Not affiliated with or endorsed by X Corp.

## Author

Vishal Raghav, Software Engineer (Frontend, Backend, DevOps)
GitHub: [@vishalraghav0290](https://github.com/vishalraghav0290)
Live site: none

## License

[MIT](LICENSE)
