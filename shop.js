/* ============================================================
   BALAGHA — Shop Data & Filtering
============================================================ */

const PRODUCTS = [
  {
    id: 'p1',
    name: 'Premium Cotton Two-Piece Khimar Set',
    category: 'prayer-dresses',
    price: 2499,
    image: 'images/product_prayer_dress_1.png',
    badge: 'bestseller',
    color: 'cream',
    date: '2025-01-10'
  },
  {
    id: 'p2',
    name: 'Rose Blush Modest Nightgown',
    category: 'nighties',
    price: 1899,
    image: 'images/product_nighty_1.png',
    badge: 'new',
    color: 'rose',
    date: '2025-02-15'
  },
  {
    id: 'p3',
    name: 'Classic Crepe Abaya with Hijab',
    category: 'prayer-dresses',
    price: 3299,
    image: 'images/prayer_dress_hero.png',
    badge: null,
    color: 'mocha',
    date: '2024-11-20'
  },
  {
    id: 'p4',
    name: 'Silk Touch Long Sleeve Nightdress',
    category: 'nighties',
    price: 2199,
    image: 'images/nightie_collection.png',
    badge: null,
    color: 'rose',
    date: '2024-12-05'
  },
  {
    id: 'p5',
    name: 'Everyday Jilbab (One Piece)',
    category: 'prayer-dresses',
    price: 1999,
    image: 'images/product_prayer_dress_1.png',
    badge: null,
    color: 'sage',
    date: '2025-01-05'
  },
  {
    id: 'p6',
    name: 'Lace Trim Cotton Sleepwear',
    category: 'nighties',
    price: 1699,
    image: 'images/product_nighty_1.png',
    badge: 'sale',
    color: 'cream',
    date: '2024-10-15'
  },
  {
    id: 'p7',
    name: 'Embroidered Prayer Dress',
    category: 'prayer-dresses',
    price: 2899,
    image: 'images/prayer_dress_hero.png',
    badge: 'new',
    color: 'cream',
    date: '2025-02-20'
  },
  {
    id: 'p8',
    name: 'Satin Modest Pyjama Set',
    category: 'nighties',
    price: 2699,
    image: 'images/nightie_collection.png',
    badge: null,
    color: 'mocha',
    date: '2024-12-25'
  }
];

const Shop = (() => {
  let activeCat = 'all';
  let activePrice = 'all';
  let activeColor = 'all';
  let activeSort = 'featured';
  let searchQuery = '';

  const els = {
    grid: document.getElementById('product-grid'),
    count: document.getElementById('result-count'),
    empty: document.getElementById('empty-state'),
    mobileBtn: document.getElementById('mobile-filter-btn'),
    sidebar: document.getElementById('shop-sidebar'),
    closeBtn: document.getElementById('filter-close'),
    clearBtn: document.getElementById('clear-filters'),
    bc: document.getElementById('shop-bc'),
    title: document.getElementById('shop-title')
  };

  function init() {
    parseUrlParams();
    bindEvents();
    render();
  }

  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('category')) {
      activeCat = params.get('category');
      const r = document.querySelector(`input[name="cat"][value="${activeCat}"]`);
      if (r) r.checked = true;
      updateHeaderTitles(activeCat);
    }
    if (params.has('q')) {
      searchQuery = params.get('q').toLowerCase();
      els.title.textContent = `Search: "${params.get('q')}"`;
      els.bc.textContent = 'Search Results';
    }
    if (params.has('sort')) {
      activeSort = params.get('sort');
      document.getElementById('sort-select').value = activeSort;
    }
  }

  function updateHeaderTitles(cat) {
    if (cat === 'prayer-dresses') {
      els.title.textContent = 'Prayer Dresses';
      els.bc.textContent = 'Prayer Dresses';
    } else if (cat === 'nighties') {
      els.title.textContent = 'Luxury Nightwear';
      els.bc.textContent = 'Nightwear';
    } else {
      els.title.textContent = 'Shop Collection';
      els.bc.textContent = 'All Products';
    }
  }

  function bindEvents() {
    // Radio filters
    document.querySelectorAll('input[name="cat"]').forEach(r => {
      r.addEventListener('change', e => {
        activeCat = e.target.value;
        updateHeaderTitles(activeCat);
        // Clear search if changing category
        if (searchQuery) {
          searchQuery = '';
          const url = new URL(window.location);
          url.searchParams.delete('q');
          window.history.replaceState({}, '', url);
        }
        render();
      });
    });

    document.querySelectorAll('input[name="price"]').forEach(r => {
      r.addEventListener('change', e => {
        activePrice = e.target.value;
        render();
      });
    });

    // Color spots
    document.querySelectorAll('.color-opt').forEach(el => {
      el.addEventListener('click', e => {
        document.querySelectorAll('.color-opt').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        activeColor = el.dataset.color;
        render();
      });
    });

    // Sort
    document.getElementById('sort-select')?.addEventListener('change', e => {
      activeSort = e.target.value;
      render();
    });

    // Mobile filters
    if (els.mobileBtn) {
      els.mobileBtn.addEventListener('click', () => els.sidebar.classList.add('open'));
    }
    if (els.closeBtn) {
      els.closeBtn.addEventListener('click', () => els.sidebar.classList.remove('open'));
    }
    if (els.clearBtn) {
      els.clearBtn.addEventListener('click', () => {
        window.location.href = 'shop.html';
      });
    }
  }

  function filterAndSort() {
    let results = PRODUCTS.filter(p => {
      // Search
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery)) return false;
      // Category
      if (activeCat !== 'all' && p.category !== activeCat) return false;
      // Price
      if (activePrice === 'u2000' && p.price >= 2000) return false;
      if (activePrice === '2000-3000' && (p.price < 2000 || p.price > 3000)) return false;
      if (activePrice === 'a3000' && p.price <= 3000) return false;
      // Color
      if (activeColor !== 'all' && p.color !== activeColor) return false;
      return true;
    });

    switch (activeSort) {
      case 'price-asc': results.sort((a, b) => a.price - b.price); break;
      case 'price-desc': results.sort((a, b) => b.price - a.price); break;
      case 'new': results.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
      // featured keeps default order (bestsellers first intuitively)
    }

    return results;
  }

  function renderCard(p) {
    let badgeHtml = '';
    if (p.badge === 'bestseller') badgeHtml = '<span class="product-card-badge badge-bestseller">Bestseller</span>';
    if (p.badge === 'new') badgeHtml = '<span class="product-card-badge badge-new">New</span>';
    if (p.badge === 'sale') badgeHtml = '<span class="product-card-badge badge-sale">Sale</span>';

    const isWish = window.Wishlist ? window.Wishlist.has(p.id) : false;
    const heartClass = isWish ? 'active' : '';

    return `
      <a href="product.html?id=${p.id}" class="product-card" data-product data-product-id="${p.id}" data-name="${p.name}" data-price="${p.price}">
        <div class="product-card-img">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
          ${badgeHtml}
          <button class="wishlist-btn ${heartClass}" data-wishlist-btn="${p.id}" data-name="${p.name}" aria-label="Add to wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></button>
        </div>
        <div class="product-card-body">
          <div class="product-card-cat">${p.category === 'prayer-dresses' ? 'Prayer Dress' : 'Nightwear'}</div>
          <h3 class="product-card-name">${p.name}</h3>
          <div class="product-card-footer">
            <div class="product-card-price">
              <span class="old-price">₹${Math.round(p.price * 1.35).toLocaleString()}</span>
              <span class="price-current">₹${p.price.toLocaleString()}</span>
            </div>
            <button class="card-add-btn" data-quick-add aria-label="Add to cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></button>
          </div>
        </div>
      </a>
    `;
  }

  function render() {
    if (!els.grid) return;
    const data = filterAndSort();
    els.count.textContent = data.length;
    
    if (data.length === 0) {
      els.grid.style.display = 'none';
      els.empty.style.display = 'block';
    } else {
      els.grid.style.display = '';
      els.empty.style.display = 'none';
      els.grid.innerHTML = data.map(renderCard).join('');
      
      // Re-init global listeners on new DOM
      if (window.initWishlistButtons) window.initWishlistButtons();
      if (window.initQuickAdd) window.initQuickAdd();
    }
    
    // Smooth scroll to top on mobile filtering
    if (window.innerWidth < 900 && els.sidebar.classList.contains('open')) {
      els.sidebar.classList.remove('open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return { init, getProduct: id => PRODUCTS.find(p => p.id === id) };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-grid')) Shop.init();
});
window.Shop = Shop;
