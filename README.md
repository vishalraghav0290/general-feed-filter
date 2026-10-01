# General Feed Filter for X

**Keep only the posts you care about in your X (Twitter) "For You" feed.**

General Feed Filter is a free, open-source browser extension that hides every post in your X "For You" timeline that doesn't match your keywords. It ships with an **aviation preset** (airlines, aircraft, airports, air forces and more), and you can swap it for any topic: football, cricket, F1, tech, crypto, cooking, whatever you like.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4)
![Works on](https://img.shields.io/badge/Works%20on-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20Opera-success)
![Privacy](https://img.shields.io/badge/Data-stays%20on%20your%20device-brightgreen)

---

## Features

- **Topic-only feed:** posts that don't mention any of your keywords are collapsed or removed.
- **Your keywords, your topic:** edit the list in the popup. The aviation preset is just the default.
- **Smart matching:** whole-word, case-insensitive matching, so `atc` won't match "w**atc**h".
- **Two hide modes:** dim and collapse (default), or remove completely.
- **Only touches "For You":** the Following tab, profiles, search, notifications and single posts are left alone.
- **On-screen counter:** a small badge shows how many posts were kept and hidden. Click it to turn the filter on or off.
- **Private:** no servers, no analytics, no account. Everything runs inside your browser.

## Install (about 2 minutes)

This extension isn't on the Chrome Web Store, so you install it in "developer mode". It's safe and fully reversible.

### 1. Download

1. Go to the [**latest release**](https://github.com/vishalraghav0290/general-feed-filter/releases/latest).
2. Under **Assets**, download `general-feed-filter-v1.0.0.zip` (the version number may be newer).
3. **Unzip it** to a folder you'll keep, e.g. `Documents\general-feed-filter`. Don't delete this folder later: the browser loads the extension from it.

### 2. Load it into your browser

**Google Chrome**
1. Open `chrome://extensions` in the address bar.
2. Turn on **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`).

**Microsoft Edge**
1. Open `edge://extensions`.
2. Turn on **Developer mode** (left sidebar).
3. Click **Load unpacked** and select the unzipped folder.

**Brave / Opera / Vivaldi / other Chromium browsers**
Open `brave://extensions` (or `opera://extensions`, `vivaldi://extensions`), enable **Developer mode**, then **Load unpacked**.

> Firefox and Safari aren't supported yet.

### 3. Pin it (optional)

Click the puzzle-piece icon in the toolbar and pin **General Feed Filter** so its settings are one click away.

## How to use

1. Open [x.com/home](https://x.com/home) and select the **For You** tab.
2. Off-topic posts are hidden automatically. A badge in the bottom-right corner shows `Feed filter · N kept · N hidden`.
3. Click the badge any time to switch the filter off or on.

### Change the topic

1. Click the extension icon in your toolbar.
2. Edit the **Filter keywords** box. Separate keywords with commas; phrases like `premier league` work too.
3. Click **Save**. Your feed updates immediately.

Example keyword lists:

| Topic | Keywords |
|---|---|
| Football | `football, soccer, premier league, champions league, la liga, goal, transfer, var` |
| Cricket | `cricket, ipl, test match, odi, t20, wicket, bcci, icc` |
| Formula 1 | `f1, formula 1, grand prix, pole position, pit stop, fia, verstappen` |
| Tech | `ai, javascript, python, open source, github, startup, llm` |

Click **Reset to aviation preset** to go back to the default list.

### Settings

| Setting | What it does |
|---|---|
| Filter enabled | Turns filtering on or off (same as clicking the badge). |
| Fully remove posts | **Off:** hidden posts are collapsed and dimmed. **On:** they're removed from view entirely. |
| Filter keywords | A post is kept if it contains any keyword as a whole word or phrase. |

Settings sync across your browsers if you're signed in to browser sync.

## Privacy

- Requests only the `storage` permission and access to `x.com` / `twitter.com`.
- Reads post text **locally** to decide what to hide. Nothing is sent anywhere.
- No tracking, analytics or remote code.

## Updating

1. Download the newest zip from [Releases](https://github.com/vishalraghav0290/general-feed-filter/releases).
2. Replace the contents of your extension folder with the new files.
3. On `chrome://extensions`, click the **reload** icon on the General Feed Filter card.

## Uninstalling

Open `chrome://extensions` (or your browser's equivalent) and click **Remove** on the extension card. Then you can delete the folder.

## Troubleshooting

- **Nothing is hidden:** make sure you're on `x.com/home` with the **For You** tab selected, and the filter is enabled. Reload the X tab after installing.
- **Too much is hidden:** add more keywords for your topic, or switch "Fully remove posts" off to see collapsed posts.
- **"Manifest file is missing or unreadable":** you selected the wrong folder. Pick the folder that directly contains `manifest.json`.
- **Chrome warns about developer-mode extensions:** this is normal for extensions installed outside the Web Store. You can dismiss it.

## Build from source

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/vishalraghav0290/general-feed-filter.git
cd general-feed-filter
npm install
npm run build
```

Then **Load unpacked** the generated `dist/` folder.

Project layout:

```text
src/
  keywords.ts   default (aviation) keyword preset + shared settings helpers
  content.ts    runs on x.com and hides non-matching posts
  popup.ts      settings popup logic
public/
  manifest.json, popup.html, icons   copied into dist/ as-is
scripts/
  build.mjs     clean + copy steps around the TypeScript compile
```

Other scripts: `npm run typecheck`.

## Contributing

Issues and pull requests are welcome. Better default presets, matching improvements, and support for more browsers are especially useful.

## License

[MIT](LICENSE) © 2026 vishal Raghav

This project isn't affiliated with or endorsed by X Corp.
