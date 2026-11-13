# CS2 Vision

View CSStats, FACEIT and Leetify data, plus Steam account information.

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/clploogmlpocoolonhlogblopobiccgb?label=version)](https://chromewebstore.google.com/detail/cs2-vision/clploogmlpocoolonhlogblopobiccgb)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/clploogmlpocoolonhlogblopobiccgb?label=users)](https://chromewebstore.google.com/detail/cs2-vision/clploogmlpocoolonhlogblopobiccgb)
[![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/rating/clploogmlpocoolonhlogblopobiccgb?label=rating)](https://chromewebstore.google.com/detail/cs2-vision/clploogmlpocoolonhlogblopobiccgb)

<picture>
  <img src="./docs/screenshot-01.png" alt="CS2 Vision preview on a Steam profile" width="720">
</picture>

## Features

- **SteamID64 Display:** Auto-detected and shown below the profile info
- **Account Status:** VAC ban and Overwatch notice, even if Steam stops displaying the ban on the profile
- **CS Stats:** Premier ratings (current and best season) and general stats (K/D ratio, HLTV rating, matches played, win rate, HS%, and ADR)
  - **Tracking Status:** Detects disabled or inactive match tracking and shows a contextual message
  - **Private Profile Handling:** Shows a message when the csstats.gg profile is private
- **FACEIT Integration:** Skill level, ELO, stats, player name, country flag, and profile link
  - **Verified Badge:** Shows a verified icon next to the FACEIT name for VIP verified accounts
  - **Challenger Badges:** Regional top 1000 players show the regional challenger badge with rank
- **Leetify Integration:** Aim, Utility, Positioning, Clutch, Opening, and Leetify rating

## Install

### Setup

```bash
pnpm install
```

### Build

```bash
pnpm dev     # development build -> dist-dev/
pnpm build   # production build  -> dist/
```

Each build writes a self-contained extension (`manifest.json`, `content.js`, `background.js`, `content.css`, `assets/`) to its output directory. Load that directory as an unpacked extension in `chrome://extensions/` with developer mode enabled.

## License

MIT
