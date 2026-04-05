/* ============================================================
   BALAGHA — Main JavaScript
   Cart, Nav, Wishlist, Toast, Sync
============================================================ */

'use strict';

/* ── UI Modal Manager ── */
const Modal = (() => {
  function create() {
    let m = document.getElementById('balagha-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'balagha-modal';
      m.className = 'balagha-modal-overlay hide';
      m.innerHTML = `
        <div class="balagha-modal-content">
          <p id="balagha-modal-text"></p>
          <div class="balagha-modal-actions">
            <button id="balagha-modal-yes" class="btn btn-primary btn-sm">Add One More</button>
            <button id="balagha-modal-no" class="btn btn-secondary btn-sm">Keep Current</button>
          </div>
        </div>
      `;
      document.body.appendChild(m);
    }
    return m;
  }

  function confirm(message, onYes) {
    const m = create();
    document.getElementById('balagha-modal-text').textContent = message;
    const btnYes = document.getElementById('balagha-modal-yes');
    const btnNo = document.getElementById('balagha-modal-no');
    
    // cleanup old listeners
    const newBtnYes = btnYes.cloneNode(true);
    const newBtnNo = btnNo.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    btnNo.parentNode.replaceChild(newBtnNo, btnNo);

    const close = () => {
      m.classList.add('hide');
      setTimeout(() => m.style.display = 'none', 300);
    };

    newBtnYes.addEventListener('click', () => { onYes(); close(); });
    newBtnNo.addEventListener('click', close);
    m.addEventListener('click', (e) => { if (e.target === m) close(); });

    m.style.display = 'flex';
    void m.offsetWidth; // force reflow
    m.classList.remove('hide');
  }

  return { confirm };
})();



/* ── Cart State ── */
const Cart = (() => {
  const STORAGE_KEY = 'balagha_cart';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateBadge();
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items } }));
  }
  function getItems() { return load(); }
  function totalCount() { return load().reduce((s, i) => s + i.qty, 0); }

  function add(product) {
    const items = load();
    const key = `${product.id}-${product.size || 'S'}`;
    const idx = items.findIndex(i => i.key === key);
    if (idx > -1) {
      Modal.confirm(`Already in your cart — would you like to add one more?`, () => {
        items[idx].qty += product.qty || 1;
        save(items);
        Toast.show(`Quantity updated for "${product.name}"`, 'success');
        bumpBadge();
      });
    } else {
      items.push({ ...product, qty: product.qty || 1, key });
      save(items);
      Toast.show(`"${product.name}" added to cart!`, 'cart');
      bumpBadge();
    }
  }

  function remove(key) {
    const items = load().filter(i => i.key !== key);
    save(items);
  }

  function updateQty(key, qty) {
    const items = load();
    const idx = items.findIndex(i => i.key === key);
    if (idx > -1) {
      if (qty <= 0) { items.splice(idx, 1); }
      else { items[idx].qty = qty; }
    }
    save(items);
  }

  function clear() { save([]); }

  function subtotal() {
    return load().reduce((s, i) => s + i.price * i.qty, 0);
  }

  function updateBadge() {
    const count = totalCount();
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function bumpBadge() {
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 300);
    });
  }

  return { add, remove, updateQty, clear, getItems, totalCount, subtotal, updateBadge, bumpBadge };
})();

/* ── Wishlist State ── */
const Wishlist = (() => {
  const KEY = 'balagha_wishlist';
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function save(ids) { 
    localStorage.setItem(KEY, JSON.stringify(ids));
    updateWishlistBadge();
    window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { ids } }));
  }
  function toggle(id, name) {
    const ids = load();
    const idx = ids.indexOf(id);
    if (idx > -1) {
      ids.splice(idx, 1);
      save(ids);
    } else {
      ids.push(id);
      save(ids);
      bumpWishlistBadge();
    }
  }
  function has(id) { return load().includes(id); }
  function syncButtons() {
    document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
      btn.classList.toggle('active', has(btn.dataset.wishlistBtn));
    });
    updateWishlistBadge();
  }
  return { toggle, has, syncButtons, load };
})();

/* ── Toast ── */
const Toast = (() => {
  let activeToasts = [];
  function getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function dismiss(t) {
    if (!t || t.classList.contains('hide')) return;
    t.classList.add('hide'); // triggers exit translation
    t.classList.remove('show');
    activeToasts = activeToasts.filter(a => a !== t);
    setTimeout(() => t.remove(), 400);
  }

  function show(message, type = 'info') {
    const icon = {
      cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
      heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
      info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    }[type] || '';

    if (activeToasts.length >= 2) {
      // immediately dismiss the oldest
      dismiss(activeToasts[0]);
    }

    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${icon}<span>${message}</span>`;
    getContainer().appendChild(t);
    activeToasts.push(t);

    requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('show')); });
    
    setTimeout(() => { dismiss(t); }, 3200);
  }
  return { show };
})();

/* ── Dynamic Nav Logo ── */
function initDynamicLogo() {
  const el = document.querySelector('.nav-logo-text');
  if (!el) return;

  let isArabic = false;

  function swapLogo() {
    // Step 1: fade out via CSS transition
    el.style.opacity = '0';
    el.style.transform = 'translateY(-5px)';

    setTimeout(() => {
      // Step 2: swap content while invisible
      isArabic = !isArabic;
      if (isArabic) {
        el.innerHTML = `<span class="nav-logo-arabic">البلاغة</span>`;
        el.style.direction = 'rtl';
      } else {
        el.innerHTML = `Bala<span>gha</span>`;
        el.style.direction = '';
      }

      // Step 3: position for entry
      el.style.transform = 'translateY(5px)';

      // Step 4: force reflow — commits the position change before transition starts
      void el.offsetHeight;

      // Step 5: fade in — CSS transition duration matches the setTimeout above
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 380);
  }

  setInterval(swapLogo, 3000); // alternate every 3 seconds
}

/* ── Navbar ── */
function initNav() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile');

  // Scroll behavior
  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Hamburger toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  Cart.updateBadge();
  updateWishlistBadge();
}

/* ── Scroll reveal ── */
function initScrollReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-up');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

/* ── Smooth scroll for anchor links ── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ── Newsletter form ── */
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    Toast.show('Thank you for subscribing! 🌙', 'success');
    form.reset();
  });
}

function updateWishlistBadge() {
  const count = Wishlist.load().length;
  document.querySelectorAll('.wish-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function bumpWishlistBadge() {
  document.querySelectorAll('.wish-badge').forEach(el => {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 300);
  });
}

/* ── Global Card Interactions ── */
function initCardInteractions() {
  // Use CAPTURE PHASE so this fires before the event reaches any <a> tag.
  // This ensures e.preventDefault() / e.stopPropagation() reliably block
  // link navigation when clicking wishlist or add-to-cart buttons inside cards.
  document.addEventListener('click', e => {

    // 1) Wishlist button — must intercept before <a> processes the click
    const wishBtn = e.target.closest('[data-wishlist-btn]');
    if (wishBtn) {
      e.preventDefault();           // stop link navigation
      e.stopPropagation();          // stop further propagation up
      e.stopImmediatePropagation(); // stop other capture-phase listeners
      const id   = wishBtn.dataset.wishlistBtn;
      const name = wishBtn.dataset.name || 'Item';
      Wishlist.toggle(id, name);
      // Sync all buttons for this product across the page
      document.querySelectorAll(`[data-wishlist-btn="${id}"]`).forEach(btn => {
        btn.classList.toggle('active', Wishlist.has(id));
      });
      return;
    }

    // 2) Quick Add-to-Cart button
    const quickAdd = e.target.closest('[data-quick-add]');
    if (quickAdd) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const card = quickAdd.closest('[data-product]');
      if (!card) return;
      Cart.add({
        id:    card.dataset.productId || 'unknown',
        name:  card.dataset.name     || 'Product',
        price: parseFloat(card.dataset.price) || 0,
        size:  'Default',
        image: card.querySelector('img')?.src || '',
      });
      return;
    }

    // 3) Card Navigation — only for <div> cards (not <a> which navigate natively)
    const card = e.target.closest('.product-card');
    if (card && card.dataset.productId) {
      if (card.tagName.toLowerCase() === 'div') {
        window.location.href = `product.html?id=${card.dataset.productId}`;
      }
    }
  }, { capture: true }); // ← capture phase: fires BEFORE <a> link processing
}

/* ── Cross-tab Sync ── */
function initStorageSync() {
  window.addEventListener('storage', (e) => {
    if (e.key === 'balagha_cart') {
      Cart.updateBadge();
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: Cart.getItems() } }));
    }
    if (e.key === 'balagha_wishlist') {
      updateWishlistBadge();
      Wishlist.syncButtons();
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { ids: Wishlist.load() } }));
    }
  });
}

/* ── Count-Up Animation ── */
function initPriceCountUp() {
  // Animate any element with data-count-up="NUMBER" when it scrolls into view
  const els = document.querySelectorAll('[data-count-up]');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.countUp);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
      const duration = 1100;
      const start = performance.now();
      const frame = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const value = eased * target;
        el.textContent = prefix + (decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-IN')) + suffix;
        if (progress < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      obs.unobserve(el);
    });
  }, { threshold: 0.4 });
  els.forEach(el => obs.observe(el));
}

/* ── Card Add Button pulse feedback (bubble phase, visual only) ── */
function initAddBtnFeedback() {
  // Runs in bubble phase — purely cosmetic, no propagation changes
  document.addEventListener('click', e => {
    const addBtn = e.target.closest('.card-add-btn');
    if (!addBtn) return;
    addBtn.classList.add('btn-click-pulse');
    setTimeout(() => addBtn.classList.remove('btn-click-pulse'), 300);
  }); // no capture — bubble phase only
}

/* ── Accordions ── */
function initAccordions() {
  document.querySelectorAll('[data-accordion-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      const contentId = btn.getAttribute('aria-controls');
      const content = document.getElementById(contentId);
      if (!content) return;
      
      // Close all other accordions in the same group? No, keep it simple, independent toggle.
      if (isExpanded) {
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        content.style.maxHeight = null;
      } else {
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('active');
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initDynamicLogo();
  initScrollReveal();
  initSmoothScroll();
  initNewsletter();
  initAddBtnFeedback();   // register BEFORE card interactions (bubble)
  initCardInteractions(); // capture phase — intercepts before <a> link
  initStorageSync();
  initPriceCountUp();
  initAccordions();
  // Sync wishlist buttons and badge from persisted localStorage
  Wishlist.syncButtons();
  // Safety: re-sync after a short delay to catch any late-rendered cards
  setTimeout(() => {
    Wishlist.syncButtons();
    Cart.updateBadge();
  }, 80);
});

window.Cart = Cart;
window.Wishlist = Wishlist;
window.Toast = Toast;
window.Modal = Modal;
window.initWishlistButtons = Wishlist.syncButtons;
window.updateWishlistBadge = updateWishlistBadge;
// initQuickAdd is a no-op: add-to-cart is handled globally via event delegation
window.initQuickAdd = () => {};
