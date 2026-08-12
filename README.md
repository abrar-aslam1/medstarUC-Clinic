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
scripts/          mobile-nav.js, analytics.js
assets/           images, self-hosted woff2 fonts, check-in PDF
```

Stylesheet order matters: `responsive.css` uses `!important` for mobile
overrides, and the page-specific sheets (`home.css` and friends) load
before it deliberately.

Fonts are self-hosted from `assets/fonts`, so the CSP allows no external
style or font origins. Adding a Google font would mean either self-hosting
it too or reopening `style-src` and `font-src` in `netlify.toml`.

## Analytics

`scripts/analytics.js` loads GA4 and sends the custom events. Set
`MEASUREMENT_ID` at the top of that file — until it is a real `G-` id the
script sends nothing and logs the events it *would* send to the console.

Most events come from delegated listeners matched against selectors the
markup already uses, so new links and buttons are tracked with no extra
work. Two exceptions are wired by hand, because both forms submit over
`fetch` and their success has no page load to hang off: `contact.html` and
`careers.html` call `window.msTrack()` on the fetch success branch.

| Event | Fires on |
| --- | --- |
| `phone_call_click` | any `tel:` link |
| `patient_portal_click` | eClinicalWorks portal links |
| `directions_click` | Google Maps links |
| `file_download` | the check-in PDF |
| `insurance_click` / `insurance_grid_view` | carrier logos, grid scrolled into view |
| `service_tile_click` | `.service-tile` |
| `nav_click` / `cta_click` / `outbound_click` | nav, `.btn`, offsite links |
| `form_start` / `form_submit_attempt` | first field focus, submit |
| `contact_form_submit` / `careers_application_submit` | Netlify accepted the POST |
| `scroll_depth` / `time_on_page` | 25/50/75/90%, 30/60/120/300s |

No form field values are ever sent. The contact form passes only the
preferred-location dropdown; the careers form passes nothing, because the
role is free text an applicant types into `message`.

Two things break analytics silently if changed. The GA domains in the CSP
`script-src`, `connect-src`, and `img-src` (`netlify.toml`) — remove them
and hits never leave the browser. And `ENABLE_AD_PERSONALIZATION` in
`analytics.js`, which is `false`: Google Signals and ad personalization are
off, so these events cannot currently build Google Ads remarketing
audiences. Turning it on is a HIPAA policy decision — Google does not sign
a BAA, and HHS guidance on tracking technologies treats clinic-service page
visits tied to an ad identifier as disclosable health information.
