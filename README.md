# FriendlyWare PC Arcade

A phone-friendly remake of FriendlyWare PC Arcade (1983): all ten games on a CRT-style screen, with thumb pads and a full vintage keyboard. Version 2.7.7.

**Play:** open the GitHub Pages link in Safari or Chrome. On a phone, Share → Add to Home Screen gives a full-screen app that also works offline.

## Files

- `index.html`: the playable build (what GitHub Pages serves)
- `src/`: source, one file per part: `01_core.js` engine, `02_shell.js` boot and menus, `10_`–`19_` the games, `90_ui.js` pads and keyboard, `00_assets.js` screens and sounds captured from the original
- `head.html`, `build.py`: page shell and the script that joins it with `src/`
- `package_site.py`: run `python3 package_site.py` to rebuild `index.html` after changing `src/`
- `manifest.webmanifest`, `sw.js`, `icon-*.png`: home-screen app and offline support
