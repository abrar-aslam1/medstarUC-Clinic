(function () {
  'use strict';

  function buildMobileNav() {
    var nav = document.querySelector('.ms-nav');
    if (!nav) return;

    // ── Hamburger button ──────────────────────────────────────────
    var hamburger = document.createElement('button');
    hamburger.className = 'ms-hamburger';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML =
      '<span></span><span></span><span></span>';
    nav.appendChild(hamburger);

    // ── Mobile menu overlay ───────────────────────────────────────
    var menu = document.createElement('div');
    menu.className = 'ms-mobile-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Site navigation');

    var inner = document.createElement('div');
    inner.className = 'ms-mobile-menu-inner';

    // Close button inside menu
    var closeBtn = document.createElement('button');
    closeBtn.className = 'ms-mobile-close';
    closeBtn.setAttribute('aria-label', 'Close menu');
    closeBtn.innerHTML = '&times;';
    inner.appendChild(closeBtn);

    // CTA from nav-right
    var navRight = nav.querySelector('.ms-nav-right');
    if (navRight) {
      var ctaBtn = navRight.querySelector('.btn');
      if (ctaBtn) {
        var ctaWrap = document.createElement('div');
        ctaWrap.className = 'ms-mobile-menu-cta';
        ctaWrap.appendChild(ctaBtn.cloneNode(true));
        inner.appendChild(ctaWrap);
      }
    }

    // Build nav links
    var desktopUl = nav.querySelector('ul');
    if (desktopUl) {
      var mobileUl = document.createElement('ul');
      mobileUl.className = 'ms-mobile-links';

      var items = desktopUl.querySelectorAll(':scope > li');
      items.forEach(function (li, index) {
        var mobileLi = document.createElement('li');
        var hasDropdown = li.classList.contains('ms-nav-has-menu');

        if (hasDropdown) {
          var topLink = li.querySelector(':scope > a');
          var dropdown = li.querySelector('.ms-dropdown');
          var topText = topLink
            ? topLink.textContent.replace('▾', '').trim()
            : '';
          var topHref = topLink ? topLink.getAttribute('href') : '#';

          mobileLi.className = 'ms-mobile-has-sub';

          // The row is a plain container: a link to the section, and a
          // separate button that expands the submenu. Nesting the <a>
          // inside a <button> is invalid and leaves assistive tech with
          // no clear way to express "link inside button".
          var subId = 'ms-mobile-sub-' + index;

          var toggle = document.createElement('div');
          toggle.className = 'ms-mobile-sub-toggle';

          var topA = document.createElement('a');
          topA.className = 'ms-mobile-sub-link';
          topA.href = topHref;
          topA.textContent = topText;

          var chevron = document.createElement('button');
          chevron.type = 'button';
          chevron.className = 'ms-mobile-chevron';
          chevron.setAttribute('aria-expanded', 'false');
          chevron.setAttribute('aria-controls', subId);
          chevron.setAttribute('aria-label', topText + ' submenu');
          chevron.innerHTML = '<span aria-hidden="true">▾</span>';

          toggle.appendChild(topA);
          toggle.appendChild(chevron);

          var subUl = document.createElement('ul');
          subUl.className = 'ms-mobile-sub';
          subUl.id = subId;

          if (dropdown) {
            var subLinks = dropdown.querySelectorAll('a');
            subLinks.forEach(function (a) {
              var subLi = document.createElement('li');
              var strong = a.querySelector('strong');
              var span = a.querySelector('span');
              var subA = document.createElement('a');
              subA.href = a.getAttribute('href') || '#';
              if (strong) {
                var s = document.createElement('strong');
                s.textContent = strong.textContent;
                subA.appendChild(s);
              }
              if (span) {
                var sm = document.createElement('span');
                sm.textContent = span.textContent;
                subA.appendChild(sm);
              }
              subLi.appendChild(subA);
              subUl.appendChild(subLi);
            });
          }

          mobileLi.appendChild(toggle);
          mobileLi.appendChild(subUl);
        } else {
          var link = li.querySelector('a');
          if (link) {
            var a = document.createElement('a');
            a.href = link.getAttribute('href') || '#';
            a.textContent = link.textContent.trim();
            mobileLi.appendChild(a);
          }
        }

        mobileUl.appendChild(mobileLi);
      });

      inner.appendChild(mobileUl);
    }

    menu.appendChild(inner);
    document.body.appendChild(menu);

    // ── State helpers ─────────────────────────────────────────────
    var isOpen = false;

    function openMenu() {
      isOpen = true;
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.classList.add('is-open');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('ms-menu-open');
    }

    function closeMenu() {
      isOpen = false;
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('is-open');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('ms-menu-open');
    }

    hamburger.addEventListener('click', function () {
      isOpen ? closeMenu() : openMenu();
    });

    closeBtn.addEventListener('click', closeMenu);

    // Sub-accordion toggle. The chevron is its own button now, so a click
    // on the sibling link falls through to normal navigation.
    menu.addEventListener('click', function (e) {
      var chevron = e.target.closest('.ms-mobile-chevron');
      if (chevron) {
        var parentLi = chevron.closest('.ms-mobile-has-sub');
        if (!parentLi) return;
        var wasOpen = parentLi.classList.contains('is-open');
        // close all
        menu.querySelectorAll('.ms-mobile-has-sub.is-open').forEach(function (el) {
          el.classList.remove('is-open');
          var c = el.querySelector('.ms-mobile-chevron');
          if (c) c.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          parentLi.classList.add('is-open');
          chevron.setAttribute('aria-expanded', 'true');
        }
        e.preventDefault();
      }
    });

    // Close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildMobileNav);
  } else {
    buildMobileNav();
  }
})();
