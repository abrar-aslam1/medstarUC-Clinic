#!/usr/bin/env node
/**
 * Stitches the shared topbar, nav, and footer into every page.
 *
 * Each page marks the generated regions with:
 *   <!-- build:nav --> ... <!-- /build:nav -->
 * and this script rewrites whatever sits between those markers from
 * partials/<name>.html. Edit the partial, re-run, and all pages follow.
 *
 * Output is committed, so Netlify needs no build command — the deploy
 * serves these files directly whether or not this ever runs on CI.
 *
 * Usage: node build.js [--check]
 *   --check  exit non-zero if any page is out of date (for CI/pre-commit)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PARTIALS = ['topbar', 'nav', 'footer'];

// Per-page template values. Anything absent falls back to DEFAULTS.
const DEFAULTS = {
  phone: '(972) 442-4700',
  phoneTel: '+19724424700',
};
const PAGES = {
  // Little Elm runs its own line; the nav CTA should reach that clinic.
  'location-little-elm.html': { phone: '(214) 248-8400', phoneTel: '+12142488400' },
};

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in vars)) throw new Error(`unknown template var {{${key}}}`);
    return vars[key];
  });
}

function main() {
  const check = process.argv.includes('--check');

  const partials = {};
  for (const name of PARTIALS) {
    partials[name] = fs
      .readFileSync(path.join(ROOT, 'partials', `${name}.html`), 'utf8')
      .trim();
  }

  const pages = fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .sort();

  let changed = 0;
  const stale = [];

  for (const page of pages) {
    const file = path.join(ROOT, page);
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    const vars = Object.assign({}, DEFAULTS, PAGES[page] || {});

    for (const name of PARTIALS) {
      const re = new RegExp(
        `(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`
      );
      if (!re.test(after)) {
        throw new Error(`${page}: missing <!-- build:${name} --> markers`);
      }
      const body = render(partials[name], vars);
      after = after.replace(re, `$1\n${body}\n$2`);
    }

    if (after !== before) {
      changed++;
      stale.push(page);
      if (!check) fs.writeFileSync(file, after);
    }
  }

  if (check) {
    if (changed) {
      console.error(`Out of date (run \`node build.js\`):\n  ${stale.join('\n  ')}`);
      process.exit(1);
    }
    console.log(`All ${pages.length} pages up to date.`);
  } else {
    console.log(
      `${pages.length} pages processed, ${changed} rewritten.` +
        (changed ? `\n  ${stale.join('\n  ')}` : '')
    );
  }
}

main();
