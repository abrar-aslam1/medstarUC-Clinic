/**
 * Google Analytics 4 — loader + custom event tracking.
 *
 * Loaded on every page via <script src="scripts/analytics.js" defer></script>.
 * Nothing here requires markup changes: the interactions below are picked up
 * with delegated listeners against selectors the site already uses (a[href^="tel:"],
 * .btn, .service-tile, .ins-cell, and so on). Add a link, it tracks itself.
 *
 * The two forms are AJAX-submitted, so their success events can't be inferred
 * from a page load. Their inline scripts call window.msTrack() directly on the
 * fetch success branch — see contact.html and careers.html.
 *
 * If gtag.js is ever blocked (ad blocker, CSP drift, offline), every call here
 * degrades to a no-op. The site keeps working.
 */
(function () {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────
  // GA4 Measurement ID (Admin → Data streams → Web).
  //
  // This file IS the Google tag -- it loads gtag.js and calls config itself.
  // Do not also paste the snippet Google shows you into the pages: two tags
  // on one page double every page_view.
  var MEASUREMENT_ID = 'G-GXG7YXL411';

  // Ad personalization / Google Signals. Leave FALSE unless you have
  // reviewed the HIPAA implications of building remarketing audiences from
  // clinic-service page visits. Flipping this to true is what makes these
  // events usable for a Google Ads retargeting campaign — it is a policy
  // decision, not a technical one.
  var ENABLE_AD_PERSONALIZATION = false;

  // Scroll-depth milestones, in percent of document height.
  var SCROLL_MILESTONES = [25, 50, 75, 90];

  // Time-on-page milestones, in seconds.
  var TIME_MILESTONES = [30, 60, 120, 300];

  // ── Setup ────────────────────────────────────────────────────────────
  var CONFIGURED = /^G-[A-Z0-9]{6,}$/.test(MEASUREMENT_ID);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  if (CONFIGURED) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(s);

    gtag('js', new Date());
    gtag('consent', 'default', {
      ad_storage: ENABLE_AD_PERSONALIZATION ? 'granted' : 'denied',
      ad_user_data: ENABLE_AD_PERSONALIZATION ? 'granted' : 'denied',
      ad_personalization: ENABLE_AD_PERSONALIZATION ? 'granted' : 'denied',
      analytics_storage: 'granted',
    });
    gtag('config', MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: ENABLE_AD_PERSONALIZATION,
      allow_ad_personalization_signals: ENABLE_AD_PERSONALIZATION,
    });
  } else if (window.console && console.info) {
    console.info(
      '[analytics] MEASUREMENT_ID is still the placeholder — events will be ' +
        'logged to this console but not sent. Set it in scripts/analytics.js.'
    );
  }

  // ── Page context, attached to every event ────────────────────────────
  // page_group buckets pages so reports read as "how do service pages do"
  // rather than a list of 18 URLs. clinic is set only on the two location
  // pages, so location-level conversions are attributable.
  var PATH = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var PAGE = PATH.replace(/\.html$/, '') || 'index';

  function pageGroup() {
    if (PAGE === 'index') return 'home';
    if (PAGE.indexOf('services') === 0) return 'service';
    if (PAGE.indexOf('location') === 0) return 'location';
    if (PAGE === 'contact' || PAGE === 'careers') return 'form';
    if (PAGE === 'patient-info' || PAGE === 'providers' || PAGE === 'about') return 'info';
    return 'other';
  }

  function clinic() {
    if (PAGE === 'location-murphy') return 'murphy';
    if (PAGE === 'location-little-elm') return 'little_elm';
    return undefined;
  }

  var PAGE_GROUP = pageGroup();
  var CLINIC = clinic();

  // ── Core send ────────────────────────────────────────────────────────
  function track(name, params) {
    var payload = { page_name: PAGE, page_group: PAGE_GROUP };
    if (CLINIC) payload.clinic = CLINIC;
    for (var k in params) {
      if (Object.prototype.hasOwnProperty.call(params, k) && params[k] !== undefined) {
        payload[k] = params[k];
      }
    }
    if (CONFIGURED) {
      gtag('event', name, payload);
    } else if (window.console && console.debug) {
      console.debug('[analytics]', name, payload);
    }
  }

  // Exposed so page-level scripts (the two AJAX forms) can report success.
  window.msTrack = track;

  // ── Helpers ──────────────────────────────────────────────────────────
  function text(el) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 80 ? t.slice(0, 80) : t;
  }

  // Where on the page the click happened. Useful for telling a hero CTA
  // apart from the same link repeated in the footer.
  function placement(el) {
    if (el.closest('.ms-topbar')) return 'topbar';
    if (el.closest('.ms-mobile-menu')) return 'mobile_menu';
    if (el.closest('.ms-nav')) return 'nav';
    if (el.closest('.ms-footer')) return 'footer';
    var section = el.closest('section');
    if (section && section.id) return section.id;
    if (el.closest('main > *:first-child')) return 'hero';
    return 'body';
  }

  function clinicFromHref(href) {
    if (/eldorado|little%20elm|little\+elm/i.test(href)) return 'little_elm';
    if (/fm%20544|fm\+544|murphy/i.test(href)) return 'murphy';
    return undefined;
  }

  function isOutbound(a) {
    return a.hostname && a.hostname !== location.hostname;
  }

  // Carrier logos are the one reliable marker across both insurance grids:
  // index.html wraps each in .ins-cell, patient-info.html uses bare
  // inline-styled divs.
  var INS_LOGO = 'img[src*="assets/insurance/"]';

  // ── Click tracking ───────────────────────────────────────────────────
  // One delegated listener, first match wins so a tel: link inside a .btn
  // reports as a phone call rather than a generic CTA.
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target.closest && e.target.closest('a, button');
      if (!a) return;

      var href = a.getAttribute('href') || '';
      var label = text(a);
      var where = placement(a);

      // 1. Phone — the primary conversion for a walk-in clinic.
      if (href.indexOf('tel:') === 0) {
        track('phone_call_click', {
          phone_number: href.replace('tel:', ''),
          link_text: label,
          placement: where,
        });
        return;
      }

      // 2. Patient portal (eClinicalWorks).
      if (href.indexOf('ecwcloud.com') > -1) {
        track('patient_portal_click', { link_text: label, placement: where });
        return;
      }

      // 3. Directions.
      if (href.indexOf('maps.google') > -1 || href.indexOf('goo.gl/maps') > -1) {
        track('directions_click', {
          destination: clinicFromHref(href) || CLINIC,
          placement: where,
        });
        return;
      }

      // 4. Downloads (the check-in packet).
      if (/\.pdf($|\?)/i.test(href)) {
        track('file_download', {
          file_name: href.split('/').pop(),
          link_text: label,
          placement: where,
        });
        return;
      }

      // 5. Insurance carrier cells. index.html uses .ins-cell; patient-info.html
      // builds the same grid from inline-styled divs, so match on the logo too.
      var insCell = a.closest('.ins-cell');
      var insLogo = insCell ? insCell.querySelector('img') : a.querySelector(INS_LOGO);
      if (insCell || insLogo) {
        track('insurance_click', {
          carrier: insLogo ? insLogo.getAttribute('alt') : text(insCell || a),
        });
        return;
      }

      // 6. Service tiles.
      if (a.classList.contains('service-tile') || a.closest('.service-tile')) {
        track('service_tile_click', { service: label, destination: href });
        return;
      }

      // 7. Navigation.
      if (where === 'nav' || where === 'mobile_menu' || where === 'topbar' || where === 'footer') {
        track('nav_click', { link_text: label, destination: href, placement: where });
        return;
      }

      // 8. Any remaining styled CTA.
      if (a.classList.contains('btn')) {
        track('cta_click', {
          link_text: label,
          destination: href || undefined,
          variant: a.className.replace(/\s+/g, ' ').trim(),
          placement: where,
        });
        return;
      }

      // 9. Everything else leaving the site.
      if (a.tagName === 'A' && isOutbound(a)) {
        track('outbound_click', { destination: a.href, link_text: label, placement: where });
      }
    },
    true
  );

  // ── Insurance grid visibility ────────────────────────────────────────
  // The logos aren't links, so a click event alone would under-report
  // interest in coverage. Fire once when the grid is actually seen.
  (function () {
    var logos = document.querySelectorAll(INS_LOGO);
    if (!logos.length || !window.IntersectionObserver) return;
    var container = logos[0].closest('.ins-cell')
      ? logos[0].closest('.ins-cell').parentElement
      : logos[0].parentElement.parentElement;
    if (!container) return;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          track('insurance_grid_view', { carrier_count: logos.length });
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(container);
  })();

  // ── Forms ────────────────────────────────────────────────────────────
  // form_start fires on first interaction, so the drop-off between starting
  // and submitting is visible. Never send field values — the contact form
  // asks for a name, email, and free text.
  (function () {
    var forms = document.querySelectorAll('form');
    Array.prototype.forEach.call(forms, function (form) {
      var name = form.getAttribute('name') || form.id || 'form';
      var started = false;

      form.addEventListener('focusin', function () {
        if (started) return;
        started = true;
        track('form_start', { form_name: name });
      });

      form.addEventListener('submit', function () {
        track('form_submit_attempt', {
          form_name: name,
          valid: form.checkValidity(),
        });
      });

      var file = form.querySelector('input[type="file"]');
      if (file) {
        file.addEventListener('change', function () {
          if (file.files && file.files[0]) {
            track('resume_attached', { form_name: name });
          }
        });
      }
    });
  })();

  // ── Scroll depth ─────────────────────────────────────────────────────
  (function () {
    var hit = {};
    var ticking = false;

    function check() {
      ticking = false;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      var pct = ((window.scrollY || doc.scrollTop) / scrollable) * 100;
      SCROLL_MILESTONES.forEach(function (m) {
        if (pct >= m && !hit[m]) {
          hit[m] = true;
          track('scroll_depth', { percent: m });
        }
      });
    }

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(check);
      },
      { passive: true }
    );
  })();

  // ── Time on page ─────────────────────────────────────────────────────
  // Timers are cleared when the tab is hidden so background tabs don't
  // inflate engagement.
  (function () {
    var timers = [];

    function start() {
      TIME_MILESTONES.forEach(function (secs) {
        timers.push(
          window.setTimeout(function () {
            track('time_on_page', { seconds: secs });
          }, secs * 1000)
        );
      });
    }

    function stop() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
    });

    start();
  })();
})();
