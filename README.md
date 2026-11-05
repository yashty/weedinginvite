# Shubh Nimantran: wedding invitations and video invites in every Indian language

A static website for making wedding invitations and short video invitations, sharing them over WhatsApp, and collecting RSVPs. It has no build step and no server code, so it runs on GitHub Pages or any static host.

Live: https://yashty.github.io/weedinginvite/

## Features

- **13 languages:** English, हिन्दी, मराठी, ગુજરાતી, ਪੰਜਾਬੀ, বাংলা, অসমীয়া, ଓଡ଼ିଆ, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, اردو (shown right-to-left).
  - The site's language and the invitation's language are set separately, and guests can switch the invitation to their own language.
  - Dates and numbers follow each language's own format, and ceremony names use regional terms.
- **Video invitations:** each invitation also plays as a 9:16 video of about 20 seconds, with optional music generated in the browser (a pentatonic melody over a drone).
  - Download it as **MP4 (H.264)** where the browser supports it, otherwise as WebM.
  - On phones, the **Share video** button sends the file straight to WhatsApp.
  - Guests can tap **Watch video** on the invite page.
- **10 designs:** Royal Maroon, Marigold, Emerald Garden, Ivory Blush, Midnight Gold, Peacock, Lotus, Temple Silk, Mehndi and Sindoor Minimal.
  - Each design has its own colours, frame (double, arch, corners, temple border or line), ornament and background effect.
  - The card and the video draw from the same definition in `js/invite.js`.
- **Guest experience:** an envelope-style cover opens to the card, which has a countdown, a map link and one-tap RSVP over WhatsApp.
- **Sharing:** the whole invitation is stored in the link, so no database is needed. You can copy the link, share it on WhatsApp, or download the card as a PNG.

## Design

The look follows two design guides, applied by hand:

- [Impeccable](https://impeccable.style/)'s quality checklist
- [tasteskill](https://www.tasteskill.dev/)'s house rules

In practice that means:

- one accent colour, with a dark mode
- text selection, focus rings and scrollbars coloured to match the palette
- drawn SVG icons instead of emoji
- no grids of identical cards
- small hover and press responses on buttons and links
- one deliberate animation per page: the hero entrance on the landing page and the envelope opening on the guest page

Animation uses [Motion](https://motion.dev) 14.9.1, included in the repo as `js/vendor/motion.js` (MIT licence in `js/vendor/MOTION-LICENSE.md`). Everything still works without it. When the device asks for reduced motion, the page shows its final state without animating.

## Files

| File | Purpose |
|---|---|
| `index.html` | Landing page |
| `create.html` + `js/editor.js` | Editor: card and video preview, sharing, video export |
| `invite.html` | The page guests see |
| `js/invite.js` | Templates, ornaments, card rendering, link encoding |
| `js/video.js` | Video renderer, music and recording |
| `js/i18n.js` | Languages and all translations |
| `js/ui.js` | Icons and Motion helpers |

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Add or edit a language

All text is in `js/i18n.js`:

1. Add the language to `LANGS` with its locale, text direction and Noto font.
2. Add a block of the same keys to `STRINGS`. Any key you leave out falls back to English.

The translations were written for this project. Have a native speaker check each one before launch.

## Add a design

Add an entry to `TEMPLATES` in `js/invite.js` with:

- colours: `bg`, `bg2`, `ink`, `accent`, `soft`
- a `frame`, an ornament (`orn`) and a background effect (`fx`)
- a `latin` font for names written in Latin script

The new design then appears in the gallery, the editor and the video.
