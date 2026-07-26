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
  const sections = document.querySelectorAll('.section');
  const dots = document.querySelectorAll('.dot-nav .dot');
  const scroller = document.querySelector('.scroller');

  const dotFor = (id) => document.querySelector(`.dot-nav .dot[data-target="${id}"]`);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        dots.forEach((dot) => dot.classList.remove('active'));
        const activeDot = dotFor(entry.target.id);
        if (activeDot) activeDot.classList.add('active');
      }
    });
  }, { root: scroller, threshold: 0.6 });

  sections.forEach((section) => observer.observe(section));

  // Smooth-scroll any in-page link that points at a section (dot nav,
  // the hero's scroll-cue chevron, the "Awards & Experiences" button, etc.)
  // instead of leaving it to the browser's native (often instant) anchor jump.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target || !target.classList.contains('section')) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      animateScrollTo(scroller, target.offsetTop, 700);
    });
  });

  const contactWrap = document.querySelector('.nav-contact');
  const contactToggle = document.querySelector('.nav-contact-toggle');

  if (contactWrap && contactToggle) {
    contactToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = contactWrap.classList.toggle('open');
      contactToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!contactWrap.contains(e.target)) {
        contactWrap.classList.remove('open');
        contactToggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        contactWrap.classList.remove('open');
        contactToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Artwork split button + dropdown: main link goes to the first series,
  // the caret opens a list of every series pulled from series-data.js.
  const artworkWrap = document.querySelector('.nav-artwork');
  const artworkToggle = document.querySelector('.nav-artwork-toggle');
  const artworkPanel = document.querySelector('.nav-artwork-panel');

  if (typeof SERIES_LIST !== 'undefined' && SERIES_LIST.length) {
    if (artworkPanel) {
      artworkPanel.innerHTML = SERIES_LIST
        .map((s) => `<a href="${s.page}">${s.title}</a>`)
        .join('');
    }
    document.querySelectorAll('.nav-artwork-main, .cta-artwork-link').forEach((el) => {
      el.href = SERIES_LIST[0].page;
    });
  }

  if (artworkWrap && artworkToggle) {
    artworkToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = artworkWrap.classList.toggle('open');
      artworkToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!artworkWrap.contains(e.target)) {
        artworkWrap.classList.remove('open');
        artworkToggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        artworkWrap.classList.remove('open');
        artworkToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Series pager (Previous / Main Page / Next), built from series-data.js
  // so adding a new series to that list is enough to update every page's links.
  const pager = document.querySelector('.series-pager');
  if (pager && typeof SERIES_LIST !== 'undefined') {
    const index = SERIES_LIST.findIndex((s) => s.page === pager.dataset.current);
    const prev = index > 0 ? SERIES_LIST[index - 1] : null;
    const next = index > -1 && index < SERIES_LIST.length - 1 ? SERIES_LIST[index + 1] : null;

    let html = '';
    if (prev) {
      html += `<a class="pager-btn pager-prev" href="${prev.page}"><span class="pager-arrow">&larr;</span> Previous: ${prev.title}</a>`;
    }
    html += `<a class="pager-btn pager-home" href="index.html">Main Page</a>`;
    if (next) {
      html += `<a class="pager-btn pager-next" href="${next.page}">Next: ${next.title} <span class="pager-arrow">&rarr;</span></a>`;
    }
    pager.innerHTML = html;
  }

  // Art tiles: hover reveals the overlay on desktop; tapping toggles it on touch
  // devices. Only one tile stays open at a time, and tapping anywhere outside
  // every tile closes whichever one is open.
  const artTiles = document.querySelectorAll('.art-tile');

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
      chatSubmit.textContent = 'Sending…';
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
          chatStatus.textContent = "Thanks! Your message is on its way — we'll get back to you soon.";
          chatStatus.classList.add('success');
          chatForm.reset();
        } else {
          throw new Error(result.message || 'Something went wrong.');
        }
      } catch (err) {
        chatStatus.textContent = 'Something went wrong sending your message. Please try again in a moment.';
        chatStatus.classList.add('error');
      } finally {
        chatSubmit.disabled = false;
        chatSubmit.textContent = 'Send Message';
      }
    });
  }
});
