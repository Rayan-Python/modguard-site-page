# ModGuard — marketing site

Two-page React site (Vite + React Router) with a natural, editorial look.

- **Home** (`/`) — hero + download button, what ModGuard does, how it works, disclaimer in the footer.
- **Team** (`/team`) — grid of team member cards.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## Swapping in real content later

Everything meant to change is isolated so you don't have to touch the layout:

| What | Where |
| --- | --- |
| **Download link** (the `.dmg`) | `src/pages/Home.jsx` — the `Download for Mac` `<a>`. Replace `href="#"` with the file URL and remove the `onClick`/`aria-disabled`. |
| **Team roles & bios** | `src/data/team.js` — fill in `role` and `bio` per person. |
| **Team photos** | `src/data/team.js` — set `photo` to an image path (e.g. drop a file in `public/team/` and use `/team/name.jpg`). `null` shows the initials placeholder. |
| **Colors / fonts** | `src/styles.css` — CSS variables at the top (`:root`). |
| **Disclaimer text** | `src/components/Footer.jsx`. |

## Palette

Cream background, deep forest green accent, muted moss highlights, warm charcoal
text — serif headings (Georgia) paired with a system sans for body.
# modguard-site-page
