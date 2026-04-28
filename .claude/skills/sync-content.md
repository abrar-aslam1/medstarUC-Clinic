# Sync Content from MedStarUC.com

Scrape content from a live medstaruc.com page and update the matching local HTML file to match that content — preserving all local design, layout, and structure.

## Usage

```
/sync-content https://www.medstaruc.com/<page-slug>
```

**Examples:**
- `/sync-content https://www.medstaruc.com/urgent-care`
- `/sync-content https://www.medstaruc.com/primary-care`
- `/sync-content https://www.medstaruc.com/pediatrics`
- `/sync-content https://www.medstaruc.com/womens-health`
- `/sync-content https://www.medstaruc.com/mens-health`
- `/sync-content https://www.medstaruc.com/weight-loss`
- `/sync-content https://www.medstaruc.com/virtual-visits`
- `/sync-content https://www.medstaruc.com/labs`

## Steps

1. **Fetch the source page** — use WebFetch on the provided URL. Extract all visible text content verbatim: headings, tagline, intro paragraph, every bullet in every service list (with any "Professional/Expert/Comprehensive" prefixes), "Why choose" body copy, stats/numbers, emergency disclaimer wording, and FAQ questions + answers.

2. **Identify the local file** — map the URL slug to a local file:
   - `urgent-care` → `services-urgent.html`
   - `primary-care` → `services-primary.html`
   - `pediatrics` → `services-pediatric.html`
   - `womens-health` → `services-womens.html`
   - `mens-health` → `services-mens.html`
   - `weight-loss` → `services-weight.html`
   - `virtual-visits` → `services-virtual.html`
   - `labs` → `services-labs.html`
   - Any other slug → search for the closest matching `services-*.html` file

3. **Read the local file** — read the current local HTML so you know exactly what exists.

4. **Diff and update** — update the local file's content to match the source. Rules:
   - **Replace** text content: headings, tagline, intro paragraph, service list items (preserve prefixes like "Professional", "Expert", "Comprehensive"), "Why choose" body paragraphs, emergency disclaimer, FAQ answers, stat labels and values.
   - **Preserve** all HTML structure, CSS classes, inline styles, nav, footer, breadcrumbs, CTAs, and any design elements not present on the source page.
   - **Do not** add, remove, or restructure HTML sections — only swap the text within existing elements.

5. **Report changes** — after editing, output a concise table of what changed (element → before → after). Keep it under 20 rows.
