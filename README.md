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
- **Guest versions:** make one invite with every ceremony, then add versions for different guests with some ceremonies left out, such as "Friends, without Sangeet" or "Office, without Sagai".
  - Each version has its own link, WhatsApp share, downloads and video.
  - A version's link holds only that version's ceremonies, so guests can't find the ones left out.
  - Ceremonies added later are included in every version until you untick them.
  - Versions are saved with the draft in the browser.
- **Location and QR code:**
  - **Pick on map** opens an OpenStreetMap picker. You can search for the venue, tap the map, drag the pin, or use **Use my location**.
  - Picking a place fills in the venue and address if they're empty. Each ceremony can have its own pin too.
  - The invitation shows a **QR code** that opens the exact pin in Google Maps. Without a pin, it searches for the venue text.
  - Six QR styles (Rounded, Classic, Dots, Classy, Gradient, Emblem), coloured to match the design. Dark dots always sit on a light tile so phones scan them reliably.
  - The QR appears on the card, guest page, video, story image, JPG/PNG/PDF, and as its own PNG or SVG download.
- **Downloads:**
  - **JPG** (for WhatsApp) and **PNG** (HD) image of the card
  - **PDF**, A5 width, ready for printing
  - **9:16 Status / Story** image (1080×1920) for WhatsApp status and Instagram
  - **MP4 / WebM** video

  The images and PDF use the print version of the card, without the countdown or buttons. Fonts are embedded, so every script comes out exactly as it appears on screen. Guests can also download the JPG, PDF and story image from the invite page.
- **Marriage biodata (`biodata.html`):** a framed biodata card with personal details, horoscope (rashi, nakshatra, gotra, manglik), education and career, family background, about and expectations, and contact.
  - Uses the same ten designs as the invitations, so a biodata can match its invitation.
  - Optional photo, cropped to 4:5 and set in an arch frame. It stays on the device and appears in downloads, but is never put in the link.
  - Share the link on WhatsApp, or download JPG, PNG (HD) or PDF (A5). On phones, label and value stack so long entries stay readable.
  - Empty fields and sections are left off the card.
- **Guest experience:** an envelope-style cover opens to the card, which has a countdown, a map link and one-tap RSVP over WhatsApp.
- **Sharing:** the whole invitation is stored in the link, so no database is needed. You can copy the link, share it on WhatsApp, or download the card as a PNG.

## Design

The visual theme is warm and ceremonial:

- **Palette:** two themes sharing one set of CSS variables (`:root` in `css/style.css`). Light is ethereal ivory: alabaster `#FBF9F5`, white cards with a `rgba(197,168,128,.15)` hairline, espresso ink `#1A1816`, warm taupe `#7A736D`, champagne gold `#C5A880` and soft rose `#EAD5D0`. Mid-dark is rich espresso: `#161412`, charcoal cards `#262320`, alabaster text, stone `#A8A29E`, antique gold `#D4AF37` and rose-gold highlights. It follows the OS setting and has a toggle in the top bar (saved in `localStorage`, applied by `js/theme.js` before first paint). `--gold` is for fills and hairlines; `--accent` is the text-safe variant.
- **Type:** Cormorant Garamond for headlines, Cinzel for small royal labels (eyebrows, card labels, section titles), and Plus Jakarta Sans for body text and form fields.
- **Cards:** invitation and biodata cards have a foil gradient border taken from each design's accent colour, soft rounded corners and layered shadows. Ceremony and biodata panels each carry a small foil tab.
- **Decorative touches:** gold-line floral sprigs in the hero and closing sections, foil hairline dividers with a lotus flourish, and a gentle shimmer that sweeps across buttons and RSVP buttons on hover (turned off when reduced motion is requested).
- **Spacing:** generous section padding, centred section heads with eyebrows and dividers, and editor groups set as separate cards.

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

The UI was then checked against the [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) checklist. That led to:

- touch targets of at least 44px, and 16px form text on phones (so iPhones don't zoom in)
- phone-number checks when you leave the field, with the error shown next to it
- an Undo message after deleting a ceremony or version
- empty states, and a "Saved on this device" note
- a skip-to-content link and spoken status messages
- a video player that closes with Escape and returns keyboard focus to where it was
- a consistent shadow scale, and a dark-mode browser colour
- the Great Vibes script face for couples' names on the Ivory Blush and Lotus designs
- every design's text measured at 4.5:1 contrast or better

Card images are captured with [html-to-image](https://github.com/bubkoo/html-to-image) 1.11.13 (MIT, included as `js/vendor/html-to-image.js`). The PDF is written directly by `js/export.js` (one page with the card as a JPEG), so no PDF library is needed.

Maps use [Leaflet](https://leafletjs.com) 1.9.4 (BSD-2, included in `js/vendor/leaflet/`, loaded only when the picker opens) with OpenStreetMap tiles and [Nominatim](https://nominatim.org) search. Searches run only when you submit, never per keystroke, in line with Nominatim's usage policy; heavy traffic would need a self-hosted or paid geocoder. QR codes use [qr-code-styling](https://github.com/oblakstudio/qr-code-styling) 1.9.2 (MIT, `js/vendor/qr-code-styling.js`).

Animation uses [Motion](https://motion.dev) 14.9.1, included in the repo as `js/vendor/motion.js` (MIT licence in `js/vendor/MOTION-LICENSE.md`). Everything still works without it. When the device asks for reduced motion, the page shows its final state without animating.

## Files

| File | Purpose |
|---|---|
| `index.html` | Landing page |
| `create.html` + `js/editor.js` | Editor: card and video preview, sharing, video export |
| `invite.html` | The page guests see |
| `biodata.html` + `js/bio-editor.js` | Biodata builder and shared biodata view |
| `js/biodata.js` | Biodata sections, sample and card rendering |
| `js/invite.js` | Templates, ornaments, card rendering, link encoding |
| `js/video.js` | Video renderer, music and recording |
| `js/i18n.js` | Languages and all translations |
| `js/ui.js` | Icons and Motion helpers |
| `js/export.js` | PNG, JPG, PDF and story-image downloads |
| `js/qr.js` | Location links and styled QR codes |
| `js/map.js` | Map location picker |

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
