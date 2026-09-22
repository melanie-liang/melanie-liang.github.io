// `scroll-snap-type: mandatory` re-snaps to the nearest section on every
// single scrollTop change, not just at the end of a gesture — which kills
// any smooth animation (native or hand-rolled) partway through. So snapping
// is switched off for the duration of the animation and restored once it
// lands exactly on the target (itself a valid snap point, so no jump).
function animateScrollTo(container, targetTop, duration) {
  const startTop = container.scrollTop;
  const distance = targetTop - startTop;
  if (distance === 0) return;
  const startTime = performance.now();
  const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

  container.classList.add('no-snap');

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    container.scrollTop = startTop + distance * easeInOutQuad(progress);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      container.classList.remove('no-snap');
    }
  }

  requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Language switch ----------
  // Text lives in the HTML as <span data-lang="en"> / <span data-lang="zh">
  // pairs and CSS shows the one matching <html lang>. The inline script in
  // each <head> has already applied a saved choice before first paint; this
  // keeps the tab title in step and handles the button.
  const isZh = () => document.documentElement.lang.startsWith('zh');
  const L = (en, zh) => `<span data-lang="en">${en}</span><span data-lang="zh">${zh}</span>`;
  const titleEl = document.querySelector('title');
  const titleEn = titleEl.dataset.en || titleEl.textContent;
  const titleZh = titleEl.dataset.zh || titleEn;
  const applyLang = (zh) => {
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    document.title = zh ? titleZh : titleEn;
    try { localStorage.setItem('lang', zh ? 'zh' : 'en'); } catch (e) { /* private mode */ }
  };
  applyLang(isZh());
  document.querySelectorAll('.lang-switch').forEach((button) => {
    button.addEventListener('click', () => applyLang(!isZh()));
  });

  const sections = document.querySelectorAll('.section');
  const dots = document.querySelectorAll('.dot-nav .dot');
  const scroller = document.querySelector('.scroller');

  const dotFor = (id) => document.querySelector(`.dot-nav .dot[data-target="${id}"]`);

  // On the homepage the header underline follows the section in view rather
  // than sitting on About the whole time: Home while the hero is on screen,
  // About once the bio or awards section is. Both are null on every other page,
  // which has no .section elements for the observer to fire on anyway.
  const homeLink = document.querySelector('.nav-logo');
  const aboutLink = document.querySelector('.nav-menu a[href^="#"]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        dots.forEach((dot) => dot.classList.remove('active'));
        const activeDot = dotFor(entry.target.id);
        if (activeDot) activeDot.classList.add('active');

        if (homeLink && aboutLink) {
          const onHero = entry.target.id === 'hero';
          homeLink.classList.toggle('active', onHero);
          aboutLink.classList.toggle('active', !onHero);
        }
      }
    });
  // A thin line across the middle of the screen, rather than "60% visible":
  // on phones the sections are as tall as their content, and a section taller
  // than the screen can never be 60% visible, so it would never register.
  }, { root: scroller, rootMargin: '-50% 0px -50% 0px', threshold: 0 });

  sections.forEach((section) => observer.observe(section));

  // Smooth-scroll any in-page link that points at a section (dot nav,
  // the hero's scroll-cue chevron, the "Awards & Experiences" button, etc.)
  // instead of leaving it to the browser's native (often instant) anchor jump.
  // On phones the homepage is one free-scrolling long page (no snapping), and
  // the fixed header would sit over the top of whatever we scroll to, so stop
  // short by its height. On desktop the snap points take care of alignment.
  const headerOffset = () =>
    getComputedStyle(scroller).scrollSnapType === 'none'
      ? document.querySelector('.site-nav').offsetHeight
      : 0;

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target || !target.classList.contains('section')) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      animateScrollTo(scroller, Math.max(0, target.offsetTop - headerOffset()), 700);
    });
  });

  // Split-section scroll cue: hints that the text panel (e.g. Awards &
  // Recognition) scrolls internally, and nudges it down a bit on click. At the
  // bottom the arrow flips to point up and the button scrolls back to the top,
  // so there is a clear signal that the list has ended.
  document.querySelectorAll('.split-scroll-cue').forEach((cue) => {
    const textPanel = cue.closest('.split-section').querySelector('.split-text');
    if (!textPanel) return;

    const scrollable = () => textPanel.scrollHeight - textPanel.clientHeight > 8;
    const atEnd = () =>
      textPanel.scrollTop + textPanel.clientHeight >= textPanel.scrollHeight - 4;

    const sync = () => {
      cue.hidden = !scrollable();
      const end = atEnd();
      cue.classList.toggle('at-end', end);
      cue.setAttribute('aria-label', end ? 'Back to the top of this list' : 'Scroll down for more');
    };

    cue.addEventListener('click', () => {
      textPanel.scrollTo({
        top: atEnd() ? 0 : textPanel.scrollTop + 260,
        behavior: 'smooth',
      });
    });

    textPanel.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    sync();
  });

  // The "Works" button slides: this page leaves to the left and the next one
  // arrives from the right, which is what its right-pointing arrow promises.
  // Any other link navigates normally. The incoming half is started by the
  // inline script in <head> so it runs before the first paint.
  const slideLink = document.querySelector('.cta-artwork-link');
  if (slideLink) {
    slideLink.addEventListener('click', (e) => {
      // let cmd/ctrl/middle-click still open a new tab
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      try { sessionStorage.setItem('slide-in', '1'); } catch (err) { /* private mode */ }
      document.body.classList.add('is-leaving');
      // navigate just before the slide finishes, so the eye never rests on
      // an empty background while the next page loads
      setTimeout(() => { window.location.href = slideLink.href; }, 300);
    });
  }

  // Series pager (Previous / All Series / Next), built from series-data.js
  // so adding a new series to that list is enough to update every page's links.
  const pager = document.querySelector('.series-pager');
  if (pager && typeof SERIES_LIST !== 'undefined') {
    const index = SERIES_LIST.findIndex((s) => s.page === pager.dataset.current);
    const prev = index > 0 ? SERIES_LIST[index - 1] : null;
    const next = index > -1 && index < SERIES_LIST.length - 1 ? SERIES_LIST[index + 1] : null;

    let html = '';
    if (prev) {
      html += `<a class="pager-btn pager-prev" href="${prev.page}"><span class="pager-arrow">&larr;</span> ${L(`Previous: ${prev.title}`, `上一个：${prev.titleZh || prev.title}`)}</a>`;
    }
    html += `<a class="pager-btn pager-all" href="series.html">${L('All Series', '全部系列')}</a>`;
    if (next) {
      html += `<a class="pager-btn pager-next" href="${next.page}">${L(`Next: ${next.title}`, `下一个：${next.titleZh || next.title}`)} <span class="pager-arrow">&rarr;</span></a>`;
    }
    pager.innerHTML = html;
  }

  // Art tiles: hover reveals the overlay on desktop; tapping toggles it on touch
  // devices. Only one tile stays open at a time, and tapping anywhere outside
  // every tile closes whichever one is open.
  // Tiles with no caption have nothing to reveal: mark them so the CSS drops
  // the blur/zoom/pointer entirely, and leave them out of the tap handling.
  const artTiles = [...document.querySelectorAll('.art-tile')].filter((tile) => {
    if (tile.querySelector('.art-overlay')) return true;
    tile.classList.add('art-tile--plain');
    return false;
  });

  artTiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      const wasActive = tile.classList.contains('active');
      artTiles.forEach((t) => t.classList.remove('active'));
      if (!wasActive) tile.classList.add('active');
    });
  });

  if (artTiles.length) {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.art-tile')) {
        artTiles.forEach((t) => t.classList.remove('active'));
      }
    });
  }

  // Floating chat button: opens a contact-form modal that posts to Web3Forms
  // (see js/site-config.js for the access key) so submissions land in an
  // inbox without any server-side code of our own.
  const chatButton = document.getElementById('chat-button');
  const chatModal = document.getElementById('chat-modal');
  const chatForm = document.getElementById('chat-form');

  if (chatButton && chatModal && chatForm) {
    const chatModalClose = chatModal.querySelector('.chat-modal-close');
    const chatModalBackdrop = chatModal.querySelector('.chat-modal-backdrop');
    const chatStatus = chatModal.querySelector('.chat-form-status');
    const chatSubmit = chatForm.querySelector('.chat-form-submit');

    const openChat = () => {
      chatModal.hidden = false;
      document.body.classList.add('chat-modal-open');
      chatForm.querySelector('input[type="text"]').focus();
    };

    const closeChat = () => {
      chatModal.hidden = true;
      document.body.classList.remove('chat-modal-open');
      chatButton.focus();
    };

    chatButton.addEventListener('click', openChat);
    chatModalClose.addEventListener('click', closeChat);
    chatModalBackdrop.addEventListener('click', closeChat);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !chatModal.hidden) closeChat();
    });

    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      chatSubmit.disabled = true;
      chatSubmit.innerHTML = L('Sending…', '发送中…');
      chatStatus.textContent = '';
      chatStatus.className = 'chat-form-status';

      const payload = {
        access_key: typeof WEB3FORMS_ACCESS_KEY !== 'undefined' ? WEB3FORMS_ACCESS_KEY : '',
        subject: 'New message from your portfolio site',
        name: chatForm.elements.name.value,
        email: chatForm.elements.email.value,
        message: chatForm.elements.message.value,
        botcheck: chatForm.elements.botcheck.checked,
      };

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (result.success) {
          chatStatus.innerHTML = L("Thanks! Your message is on its way — we'll get back to you soon.", '谢谢！留言已发送，我们会尽快回复你。');
          chatStatus.classList.add('success');
          chatForm.reset();
        } else {
          throw new Error(result.message || 'Something went wrong.');
        }
      } catch (err) {
        chatStatus.innerHTML = L('Something went wrong sending your message. Please try again in a moment.', '留言发送失败，请稍后再试。');
        chatStatus.classList.add('error');
      } finally {
        chatSubmit.disabled = false;
        chatSubmit.innerHTML = L('Send Message', '发送');
      }
    });
  }
});
