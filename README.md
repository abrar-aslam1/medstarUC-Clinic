# medstarUC-Clinic

MedStar UC Clinic website. Static HTML, no framework, deployed on Netlify
from `main`.

## Setup

```sh
git config core.hooksPath .githooks
```

One command, once per clone. It enables a pre-commit hook that refuses a
commit whose pages have drifted from the shared partials. Git does not
share hooks automatically, so a fresh clone has no protection until this
is run.

## Shared nav, topbar and footer

Those three blocks are **generated**. Do not edit them inside a page —
the next build overwrites your change.

```
partials/topbar.html    edit these
partials/nav.html
partials/footer.html

npm run build           stitch them into all 21 pages
npm run check           fail if any page has drifted (CI + pre-commit)
```

Per-page values live in the `PAGES` map in `build.js`. That is how
`location-little-elm.html` keeps its own phone number while every other
page uses the Murphy line.

Netlify runs `npm run check` on deploy. It validates only, never
rewrites: the generated pages are committed and served as-is. If a page
has drifted the deploy fails, and the previous deploy stays live.

## Layout

```
*.html            pages (generated regions marked <!-- build:nav --> etc.)
partials/         shared chrome
styles/           medstar.css, medstar-directions.css (civic theme),
                  medstar-pages.css, home.css, careers.css, providers.css,
                  legal.css, responsive.css, fonts.css
scripts/          mobile-nav.js
assets/           images, self-hosted woff2 fonts, check-in PDF
```

Stylesheet order matters: `responsive.css` uses `!important` for mobile
overrides, and the page-specific sheets (`home.css` and friends) load
before it deliberately.

Fonts are self-hosted from `assets/fonts`, so the CSP allows no external
style or font origins. Adding a Google font would mean either self-hosting
it too or reopening `style-src` and `font-src` in `netlify.toml`.
