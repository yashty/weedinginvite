# Shubh Nimantran: digital wedding invitations in every Indian language

A static website for making digital wedding invitations, sharing them over WhatsApp, and collecting RSVPs. It has no build step and no server code, so it runs on any static host.

## Features

- **13 languages:** English, हिन्दी, मराठी, ગુજરાતી, ਪੰਜਾਬੀ, বাংলা, অসমীয়া, ଓଡ଼ିଆ, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, اردو (shown right-to-left).
  - The site's own language and the invitation's language are set separately.
  - Guests can switch the invitation to their own language from the invite link.
  - Dates, times and countdown numbers are formatted for each locale with `Intl` (for example, Tamil month names and Urdu digits).
  - Each script loads a matching Noto font from Google Fonts when it's first needed.
- **4 designs:** Royal Maroon, Marigold, Emerald Garden and Ivory Blush, all in CSS and SVG with no image files.
- **Ceremonies:** Engagement, Haldi, Mehndi, Sangeet, Wedding and Reception, plus custom ones, each with its own date, time and venue. Ceremony names are translated per region (for example, Gaye Holud and Bou Bhaat in Bengali, Nikah and Walima in Urdu).
- **Sharing:** the whole invitation is stored in the link (`invite.html#d=…`), so you don't need a database. There are buttons to copy the link, share it on WhatsApp, or download the invitation as a PNG.
- **RSVP:** guests tap Accept or Decline, and a pre-written message in their language opens in WhatsApp, addressed to your number.
- Live countdown, Google Maps link, and a draft that is saved automatically in the browser.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page: hero, features, design gallery |
| `create.html` | Editor with a live preview and sharing |
| `invite.html` | The page guests see |

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Push to GitHub and turn on **Settings → Pages → Deploy from branch**. Netlify, Vercel and Cloudflare Pages also work with no build step.

## Add or edit a language

All text is in `js/i18n.js`:

1. Add the language to `LANGS` with its locale, text direction and Noto font.
2. Add a block of the same keys to `STRINGS`. Any key you leave out falls back to English.

The translations were written for this project. Have a native speaker check each one before launch.

## Ideas for next steps

- A backend (for example, Supabase or Firebase) for short links, an RSVP dashboard and photo uploads
- Video invitations and background music
- Per-guest personalised links ("Dear Sharma family…")
- Paid premium designs
