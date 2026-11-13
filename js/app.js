/**
 * STACKLY – ONLINE FASHION & CLOTHING BOUTIQUE HOMEPAGE
 * Vanilla JavaScript (ES6+) Application Logic
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. STATE & STORAGE MANAGEMENT
  // =========================================================================
  const STATE = {
    products: [],
    fashionProducts: [],
    newArrivals: [],
    trending: [],
    filteredProducts: [],
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'featured',
    displayLimit: 12,
    cart: JSON.parse(localStorage.getItem('stackly_cart_v1')) || [],
    wishlist: JSON.parse(localStorage.getItem('stackly_wishlist_v1')) || [],
    selectedProductForModal: null,
    modalSelectedSize: 'M',
    modalSelectedColor: 'Classic Noir',
    modalQuantity: 1
  };

  function saveCart() {
    localStorage.setItem('stackly_cart_v1', JSON.stringify(STATE.cart));
    updateCartUI();
  }

  function saveWishlist() {
    localStorage.setItem('stackly_wishlist_v1', JSON.stringify(STATE.wishlist));
    updateWishlistUI();
  }

  // =========================================================================
  // 2. UNIQUE FASHION PRELOADER (Button & Fabric Unbuttoning)
  // =========================================================================
  function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    let isDismissed = false;

    function dismiss() {
      if (isDismissed) return;
      isDismissed = true;

      // Start button unbuttoning & seam thread opening
      preloader.classList.add('unbuttoning');

      // Curtains part and reveal the boutique homepage
      setTimeout(() => {
        preloader.classList.add('dismissed');
        document.body.classList.remove('loading-locked');
      }, 1000);

      setTimeout(() => {
        preloader.style.display = 'none';
      }, 1600);
    }

    // Dismiss when DOM is loaded + images initial paint
    window.addEventListener('load', () => {
      setTimeout(dismiss, 700);
    });

    // Fallback safety timeout (ensure site never hangs)
    setTimeout(dismiss, 2400);
  }

  // =========================================================================
  // 3. TOAST NOTIFICATION SYSTEM
  // =========================================================================
  function showToast(message, iconClass = 'fa-solid fa-check') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 3200);
  }

  // =========================================================================
  // 4. NAVIGATION, STICKY HEADER & SCROLLSPY
  // =========================================================================
  function initNavigation() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const backToTop = document.getElementById('backToTopBtn');

    // Sticky Navbar & Back to Top on scroll
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }

      if (scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }

      highlightActiveNav();
    }, { passive: true });

    // Back to top click
    if (backToTop) {
      backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Mobile Hamburger Menu
    function toggleMobileMenu(open) {
      if (open === undefined) {
        open = !mobileNav.classList.contains('open');
      }
      if (open) {
        mobileNav.classList.add('open');
        mobileOverlay.classList.add('open');
        hamburger.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        mobileNav.classList.remove('open');
        mobileOverlay.classList.remove('open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    if (hamburger) {
      hamburger.addEventListener('click', () => toggleMobileMenu());
    }
    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', () => toggleMobileMenu(false));
    }

    // Smooth Scroll for Nav Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || !targetId) return;
        if (this.hasAttribute('data-policy') || this.hasAttribute('data-social')) return;

        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          toggleMobileMenu(false);
          const navOffset = 76;
          const elementPosition = targetEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });

    // Scrollspy to highlight active link
    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks = document.querySelectorAll('.nav-link, .mobile-link');

    function highlightActiveNav() {
      let scrollPos = window.scrollY + 120;
      sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    }
  }

  // =========================================================================
  // 5. DUMMYJSON API INTEGRATION & PRODUCT PROCESSING
  // =========================================================================
  const FASHION_CATEGORIES = [
    'womens-dresses',
    'womens-shoes',
    'womens-bags',
    'womens-jewellery',
    'womens-watches',
    'tops',
    'mens-shirts',
    'mens-shoes',
    'mens-watches',
    'sunglasses',
    'fragrances',
    'beauty',
    'skin-care'
  ];

  async function fetchProductsFromAPI() {
    const skeleton = document.getElementById('collectionSkeleton');
    const grid = document.getElementById('collectionGrid');
    const errorCard = document.getElementById('collectionError');

    if (skeleton) skeleton.style.display = 'grid';
    if (grid) grid.style.display = 'none';
    if (errorCard) errorCard.style.display = 'none';

    try {
      // Primary DummyJSON API call: fetch products
      let response;
      try {
        response = await fetch('https://dummyjson.com/products?limit=0', {
          headers: { 'Accept': 'application/json' }
        });
      } catch (e) {
        // Fallback to limit=30 if limit=0 is restricted
        response = await fetch('https://dummyjson.com/products?limit=30', {
          headers: { 'Accept': 'application/json' }
        });
      }

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const allProducts = data.products || [];

      // Filter and prioritize high fashion & luxury boutique items
      let fashionList = allProducts.filter(p => FASHION_CATEGORIES.includes(p.category));

      // If fashion category filter yields fewer than 15, augment with general items
      if (fashionList.length < 15) {
        fashionList = allProducts.slice(0, 30);
      }

      STATE.products = allProducts;
      STATE.fashionProducts = fashionList;

      // Curate distinct New Arrivals (first 8 fashion items)
      STATE.newArrivals = fashionList.slice(0, 8);

      // Curate distinct Trending Products (top-rated pieces, avoiding duplicate New Arrivals)
      const nonNewArrivals = fashionList.filter(p => !STATE.newArrivals.some(na => na.id === p.id));
      const sortedByRating = [...(nonNewArrivals.length >= 8 ? nonNewArrivals : fashionList)].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
      );
      STATE.trending = sortedByRating.slice(0, 8);

      // Initial Collection filter
      applyCollectionFilters();

      // Render sections
      renderNewArrivals();
      renderTrending();
      renderCollection();

      if (skeleton) skeleton.style.display = 'none';
      if (grid) grid.style.display = 'grid';

    } catch (err) {
      console.warn('DummyJSON API fetch failed or network offline:', err);
      // Graceful error display with retry option as required
      if (skeleton) skeleton.style.display = 'none';
      if (grid) grid.style.display = 'none';
      if (errorCard) errorCard.style.display = 'block';
    }
  }

  // =========================================================================
  // 6. CARD GENERATOR HELPER
  // =========================================================================
  function createProductCardHTML(product, badgeText = '', badgeClass = '', cardIdx = null) {
    const isWishlisted = STATE.wishlist.some(item => item.id === product.id);
    const originalPrice = product.discountPercentage
      ? (product.price / (1 - product.discountPercentage / 100)).toFixed(2)
      : (product.price * 1.2).toFixed(2);

    const discountBadge = product.discountPercentage
      ? `<span class="product-badge badge-discount">-${Math.round(product.discountPercentage)}%</span>`
      : '';

    const customBadge = badgeText
      ? `<span class="product-badge ${badgeClass}">${badgeText}</span>`
      : '';

    // Generate stars
    const fullStars = Math.floor(product.rating || 4.5);
    let starsHTML = '';
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        starsHTML += '<i class="fa-solid fa-star"></i>';
      } else {
        starsHTML += '<i class="fa-regular fa-star"></i>';
      }
    }

    // Clean image path (DummyJSON returns webp thumbnails)
    const imageSrc = product.thumbnail || (product.images && product.images[0]) || 'assets/product-placeholder.webp';
    const cardIdxAttr = (cardIdx !== null && cardIdx !== undefined)
      ? `data-card-idx="${cardIdx}" style="--card-i: ${Number(cardIdx) - 1};"`
      : '';

    return `
      <div class="product-card" data-product-id="${product.id}" ${cardIdxAttr}>
        <div class="product-image-container">
          ${customBadge || discountBadge}
          <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" 
                  data-action="wishlist" 
                  data-product-id="${product.id}" 
                  aria-label="Add to wishlist" 
                  title="${isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}">
            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <img src="${imageSrc}" 
               alt="${escapeHTML(product.title)}" 
               loading="lazy" 
               onerror="this.onerror=null;this.src='assets/product-placeholder.webp';" />
          <button class="quick-view-btn" data-action="quickview" data-product-id="${product.id}">
            <i class="fa-regular fa-eye"></i> Quick View
          </button>
        </div>
        <div class="product-details">
          <div class="product-category-name">${escapeHTML(formatCategoryName(product.category))}</div>
          <h4 class="product-title" data-action="quickview" data-product-id="${product.id}" title="${escapeHTML(product.title)}">
            ${escapeHTML(product.title)}
          </h4>
          <div class="product-rating">
            <div class="stars">${starsHTML}</div>
            <span class="rating-value">${product.rating || '4.8'}</span>
            <span class="rating-count">(${product.stock || 24})</span>
          </div>
          <div class="product-bottom-row">
            <div class="price-wrap">
              <span class="price-current">$${product.price.toFixed(2)}</span>
              <span class="price-original">$${originalPrice}</span>
            </div>
            <button class="add-cart-btn" data-action="add-cart" data-product-id="${product.id}" aria-label="Add to cart" title="Add to Bag">
              <i class="fa-solid fa-bag-shopping"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function formatCategoryName(cat) {
    if (!cat) return 'Atelier';
    return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // 7. RENDER SECTIONS (New Arrivals, Trending, Collection)
  // =========================================================================
  function renderNewArrivals() {
    const container = document.getElementById('newArrivalsGrid');
    if (!container) return;

    if (!STATE.newArrivals.length) {
      container.innerHTML = '<p class="text-muted">Loading fresh arrivals from atelier...</p>';
      return;
    }

    // Ensure 8 items with data-card-idx 1 to 8
    container.innerHTML = STATE.newArrivals
      .slice(0, 8)
      .map((p, idx) => createProductCardHTML(p, 'NEW ARRIVAL', 'badge-trending', idx + 1))
      .join('');

    // Trigger shuffle & arrange animation smoothly
    container.classList.remove('shuffling');
    void container.offsetWidth; // Force DOM reflow
    container.classList.add('shuffling');
  }

  function renderTrending() {
    const container = document.getElementById('trendingGrid');
    if (!container) return;

    if (!STATE.trending.length) {
      container.innerHTML = '<p class="text-muted">Loading trending collections...</p>';
      return;
    }

    container.innerHTML = STATE.trending
      .map((p, idx) => {
        const badge = idx % 2 === 0 ? 'BESTSELLER' : 'HOT PICK';
        const badgeClass = idx % 2 === 0 ? 'badge-bestseller' : 'badge-discount';
        return createProductCardHTML(p, badge, badgeClass);
      })
      .join('');
  }

  function applyCollectionFilters() {
    let result = [...STATE.fashionProducts];

    // 1. Category Filter
    if (STATE.activeCategory !== 'all') {
      if (STATE.activeCategory === 'women') {
        result = result.filter(p =>
          p.category.includes('women') || p.category === 'tops'
        );
      } else if (STATE.activeCategory === 'men') {
        result = result.filter(p =>
          p.category.includes('men')
        );
      } else if (STATE.activeCategory === 'accessories') {
        result = result.filter(p =>
          p.category.includes('sunglasses') ||
          p.category.includes('watches') ||
          p.category.includes('bags') ||
          p.category.includes('jewellery')
        );
      } else if (STATE.activeCategory === 'beauty') {
        result = result.filter(p =>
          p.category === 'beauty' ||
          p.category === 'fragrances' ||
          p.category === 'skin-care'
        );
      } else {
        result = result.filter(p => p.category === STATE.activeCategory);
      }
    }

    // 2. Search Query Filter
    if (STATE.searchQuery.trim()) {
      const q = STATE.searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // 3. Sorting
    if (STATE.sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (STATE.sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (STATE.sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (STATE.sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    STATE.filteredProducts = result;
  }

  function renderCollection() {
    const grid = document.getElementById('collectionGrid');
    const counter = document.getElementById('collectionCount');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (!grid) return;

    const visibleItems = STATE.filteredProducts.slice(0, STATE.displayLimit);

    if (counter) {
      counter.textContent = `Showing ${visibleItems.length} of ${STATE.filteredProducts.length} pieces`;
    }

    if (visibleItems.length === 0) {
      grid.innerHTML = `
        <div class="empty-result-card">
          <i class="fa-solid fa-magnifying-glass"></i>
          <h3>No sartorial matches found</h3>
          <p>Try refining your search keyword or clearing the category filter.</p>
          <button class="btn btn-secondary btn-sm" id="resetFiltersBtn">Reset All Filters</button>
        </div>
      `;
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';

      const resetBtn = document.getElementById('resetFiltersBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          STATE.activeCategory = 'all';
          STATE.searchQuery = '';
          const searchInput = document.getElementById('collectionSearch');
          if (searchInput) searchInput.value = '';
          const clearBtn = document.getElementById('searchClearBtn');
          if (clearBtn) clearBtn.classList.remove('visible');

          document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === 'all');
          });

          applyCollectionFilters();
          renderCollection();
        });
      }
      return;
    }

    grid.innerHTML = visibleItems.map((p, idx) => createProductCardHTML(p, '', '', idx + 1)).join('');

    // Trigger fade and arrange smoothly animation
    grid.classList.remove('arranging-collection');
    void grid.offsetWidth; // Force DOM reflow
    grid.classList.add('arranging-collection');

    // Toggle Load More button
    if (loadMoreBtn) {
      if (STATE.displayLimit >= STATE.filteredProducts.length) {
        loadMoreBtn.style.display = 'none';
      } else {
        loadMoreBtn.style.display = 'inline-flex';
      }
    }
  }

  // =========================================================================
  // 8. CATEGORY CARDS CLICK FILTERING & ROTATE/ARRANGE ANIMATION
  // =========================================================================
  function initCategoryClicks() {
    // 1. Category Filter Click Handler
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const catKey = card.dataset.category;
        if (!catKey) return;

        // Update active filter state
        STATE.activeCategory = catKey;
        STATE.displayLimit = 12;

        // Update toolbar tab buttons
        document.querySelectorAll('.filter-tab').forEach(tab => {
          tab.classList.toggle('active', tab.dataset.category === catKey);
        });

        // Reapply filter and render
        applyCollectionFilters();
        renderCollection();

        // Smooth scroll to Collection section
        const collectionEl = document.getElementById('collection');
        if (collectionEl) {
          const navOffset = 76;
          const elementPosition = collectionEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }

        showToast(`Filtered by ${formatCategoryName(catKey)}`, 'fa-solid fa-filter');
      });
    });

    // 2. Rotate & Arrange Animation Logic
    const categoriesSection = document.getElementById('categories');
    const categoriesGrid = document.getElementById('categoriesGrid');
    const arrangeBtn = document.getElementById('arrangeCategoriesBtn');

    function triggerArrangement() {
      if (!categoriesGrid) return;
      categoriesGrid.classList.remove('arranging');
      void categoriesGrid.offsetWidth; // Force DOM reflow
      categoriesGrid.classList.add('arranging');
    }

    if (arrangeBtn) {
      arrangeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerArrangement();
        showToast('Categories Rotated & Arranged to Position! ✨', 'fa-solid fa-arrows-rotate');
      });
    }

    // Trigger on scroll into view
    if ('IntersectionObserver' in window && categoriesSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            triggerArrangement();
          }
        });
      }, { threshold: 0.25 });

      observer.observe(categoriesSection);
    }
  }

  // =========================================================================
  // 8B. NEW ARRIVALS 8-CARD SHUFFLE & ARRANGE ANIMATION
  // =========================================================================
  function initNewArrivalsShuffle() {
    const section = document.getElementById('new-arrivals');
    const grid = document.getElementById('newArrivalsGrid');
    const shuffleBtn = document.getElementById('shuffleNewArrivalsBtn');

    function triggerShuffle() {
      if (!grid) return;
      grid.classList.remove('shuffling');
      void grid.offsetWidth; // Force DOM reflow
      grid.classList.add('shuffling');
    }

    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Fisher-Yates array shuffle for a fresh reordering of the 8 items
        if (STATE.newArrivals && STATE.newArrivals.length > 1) {
          const arr = [...STATE.newArrivals.slice(0, 8)];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          STATE.newArrivals = arr.concat(STATE.newArrivals.slice(8));
          renderNewArrivals();
        } else {
          triggerShuffle();
        }
        showToast('8 New Arrivals Shuffled & Arranged Smoothly! ✨', 'fa-solid fa-shuffle');
      });
    }

    // Trigger on scroll into view with IntersectionObserver
    if ('IntersectionObserver' in window && section) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            triggerShuffle();
          }
        });
      }, { threshold: 0.2 });

      observer.observe(section);
    }
  }

  // =========================================================================
  // 9. COLLECTION CONTROLS (Search, Filter Tabs, Sort, Load More, Retry)
  // =========================================================================
  function initCollectionControls() {
    // Filter Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        STATE.activeCategory = tab.dataset.category;
        STATE.displayLimit = 12;
        applyCollectionFilters();
        renderCollection();
      });
    });

    // Search Input
    const searchInput = document.getElementById('collectionSearch');
    const searchClearBtn = document.getElementById('searchClearBtn');

    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value;
        if (searchClearBtn) {
          searchClearBtn.classList.toggle('visible', val.length > 0);
        }

        debounceTimer = setTimeout(() => {
          STATE.searchQuery = val;
          STATE.displayLimit = 12;
          applyCollectionFilters();
          renderCollection();
        }, 250);
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchClearBtn.classList.remove('visible');
        STATE.searchQuery = '';
        STATE.displayLimit = 12;
        applyCollectionFilters();
        renderCollection();
        if (searchInput) searchInput.focus();
      });
    }

    // Sort Dropdown
    const sortSelect = document.getElementById('collectionSort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        STATE.sortBy = e.target.value;
        applyCollectionFilters();
        renderCollection();
      });
    }

    // Load More Button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        STATE.displayLimit += 8;
        renderCollection();
      });
    }

    // API Error Retry Button
    const retryBtn = document.getElementById('retryFetchBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        fetchProductsFromAPI();
      });
    }

    // Fade & Arrange Collection Button
    const arrangeCollectionBtn = document.getElementById('arrangeCollectionBtn');
    if (arrangeCollectionBtn) {
      arrangeCollectionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const grid = document.getElementById('collectionGrid');
        if (grid) {
          grid.classList.remove('arranging-collection');
          void grid.offsetWidth; // Force DOM reflow
          grid.classList.add('arranging-collection');
        }
        showToast('Boutique Collection Faded & Arranged Smoothly! ✨', 'fa-solid fa-wand-magic-sparkles');
      });
    }

    // IntersectionObserver to trigger fade & arrange on scroll into view
    const collectionSection = document.getElementById('collection');
    if ('IntersectionObserver' in window && collectionSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const grid = document.getElementById('collectionGrid');
            if (grid && !grid.classList.contains('arranging-collection')) {
              grid.classList.add('arranging-collection');
            }
          }
        });
      }, { threshold: 0.15 });

      observer.observe(collectionSection);
    }
  }

  // =========================================================================
  // 10. PRODUCT DETAILS MODAL
  // =========================================================================
  function initProductModal() {
    const modalOverlay = document.getElementById('productModalOverlay');
    const modalClose = document.getElementById('productModalClose');

    function closeModal() {
      if (modalOverlay) {
        modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    }

    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Size Selection Buttons inside Modal
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.modalSelectedSize = btn.dataset.size || 'M';
      });
    });

    // Quantity Stepper inside Modal
    const qtyMinus = document.getElementById('modalQtyMinus');
    const qtyPlus = document.getElementById('modalQtyPlus');
    const qtyVal = document.getElementById('modalQtyVal');

    if (qtyMinus && qtyPlus && qtyVal) {
      qtyMinus.addEventListener('click', () => {
        if (STATE.modalQuantity > 1) {
          STATE.modalQuantity--;
          qtyVal.textContent = STATE.modalQuantity;
        }
      });
      qtyPlus.addEventListener('click', () => {
        STATE.modalQuantity++;
        qtyVal.textContent = STATE.modalQuantity;
      });
    }

    // Add to Cart from Modal
    const modalAddCartBtn = document.getElementById('modalAddCartBtn');
    if (modalAddCartBtn) {
      modalAddCartBtn.addEventListener('click', () => {
        if (!STATE.selectedProductForModal) return;
        addToCart(STATE.selectedProductForModal, STATE.modalQuantity, STATE.modalSelectedSize);
        closeModal();
      });
    }

    // Wishlist Toggle from Modal
    const modalWishlistBtn = document.getElementById('modalWishlistBtn');
    if (modalWishlistBtn) {
      modalWishlistBtn.addEventListener('click', () => {
        if (!STATE.selectedProductForModal) return;
        toggleWishlist(STATE.selectedProductForModal);
        const isWish = STATE.wishlist.some(i => i.id === STATE.selectedProductForModal.id);
        modalWishlistBtn.classList.toggle('active', isWish);
        modalWishlistBtn.innerHTML = `<i class="${isWish ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
      });
    }
  }

  function openProductModal(productId) {
    const all = [...STATE.products, ...STATE.fashionProducts];
    const product = all.find(p => p.id === Number(productId));
    if (!product) return;

    STATE.selectedProductForModal = product;
    STATE.modalQuantity = 1;
    STATE.modalSelectedSize = 'M';

    const modalOverlay = document.getElementById('productModalOverlay');
    const modalImg = document.getElementById('modalProductImg');
    const modalCategory = document.getElementById('modalCategory');
    const modalTitle = document.getElementById('modalTitle');
    const modalPriceCurrent = document.getElementById('modalPriceCurrent');
    const modalPriceOriginal = document.getElementById('modalPriceOriginal');
    const modalDiscount = document.getElementById('modalDiscount');
    const modalDesc = document.getElementById('modalDesc');
    const modalQtyVal = document.getElementById('modalQtyVal');
    const modalWishlistBtn = document.getElementById('modalWishlistBtn');

    // Populate Data
    const originalPrice = product.discountPercentage
      ? (product.price / (1 - product.discountPercentage / 100)).toFixed(2)
      : (product.price * 1.2).toFixed(2);

    const imgSrc = product.thumbnail || (product.images && product.images[0]) || 'assets/product-placeholder.webp';

    if (modalImg) modalImg.src = imgSrc;
    if (modalCategory) modalCategory.textContent = formatCategoryName(product.category);
    if (modalTitle) modalTitle.textContent = product.title;
    if (modalPriceCurrent) modalPriceCurrent.textContent = `$${product.price.toFixed(2)}`;
    if (modalPriceOriginal) modalPriceOriginal.textContent = `$${originalPrice}`;
    if (modalDiscount) modalDiscount.textContent = product.discountPercentage ? `-${Math.round(product.discountPercentage)}% OFF` : 'EXCLUSIVE';
    if (modalDesc) modalDesc.textContent = product.description || 'Crafted with premium materials and signature Stackly tailoring, offering superior comfort, elegance, and timeless silhouettes.';
    if (modalQtyVal) modalQtyVal.textContent = '1';

    // Reset size active button
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === 'M');
    });

    // Wishlist state
    const isWish = STATE.wishlist.some(i => i.id === product.id);
    if (modalWishlistBtn) {
      modalWishlistBtn.classList.toggle('active', isWish);
      modalWishlistBtn.innerHTML = `<i class="${isWish ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
    }

    if (modalOverlay) {
      modalOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  // =========================================================================
  // 11. SHOPPING CART FUNCTIONALITY (Drawer, Subtotal, Persistence)
  // =========================================================================
  function initCartDrawer() {
    const cartBtn = document.getElementById('cartNavBtn');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartDrawerOverlay');
    const cartClose = document.getElementById('cartDrawerClose');
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');

    function toggleCart(open) {
      if (open === undefined) open = !cartDrawer.classList.contains('open');
      cartDrawer.classList.toggle('open', open);
      cartOverlay.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }

    if (cartBtn) cartBtn.addEventListener('click', () => toggleCart(true));
    if (cartClose) cartClose.addEventListener('click', () => toggleCart(false));
    if (cartOverlay) cartOverlay.addEventListener('click', () => toggleCart(false));
    if (continueShoppingBtn) {
      continueShoppingBtn.addEventListener('click', () => {
        toggleCart(false);
        const col = document.getElementById('collection');
        if (col) col.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Checkout Simulation
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (!STATE.cart.length) return;
        toggleCart(false);
        openCheckoutSuccessModal();
      });
    }

    updateCartUI();
  }

  function addToCart(product, quantity = 1, size = 'M') {
    const existingIndex = STATE.cart.findIndex(i => i.id === product.id && i.size === size);

    if (existingIndex > -1) {
      STATE.cart[existingIndex].quantity += quantity;
    } else {
      STATE.cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.thumbnail || (product.images && product.images[0]) || 'assets/product-placeholder.webp',
        category: product.category,
        size: size,
        quantity: quantity
      });
    }

    saveCart();
    showToast(`Added "${product.title}" to Bag!`, 'fa-solid fa-bag-shopping');

    // Trigger cart badge bump animation
    const badge = document.getElementById('cartCountBadge');
    if (badge) {
      badge.classList.remove('bump');
      void badge.offsetWidth;
      badge.classList.add('bump');
    }
  }

  function updateCartItemQty(id, size, change) {
    const itemIndex = STATE.cart.findIndex(i => i.id === id && i.size === size);
    if (itemIndex === -1) return;

    STATE.cart[itemIndex].quantity += change;
    if (STATE.cart[itemIndex].quantity <= 0) {
      STATE.cart.splice(itemIndex, 1);
    }
    saveCart();
  }

  function removeCartItem(id, size) {
    STATE.cart = STATE.cart.filter(i => !(i.id === id && i.size === size));
    saveCart();
    showToast('Item removed from Bag', 'fa-solid fa-trash');
  }

  function updateCartUI() {
    const totalCount = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = STATE.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Badges
    const navBadge = document.getElementById('cartCountBadge');
    const headerCount = document.getElementById('cartDrawerCount');
    if (navBadge) navBadge.textContent = totalCount;
    if (headerCount) headerCount.textContent = totalCount;

    // Items list
    const itemsContainer = document.getElementById('cartItemsList');
    const emptyState = document.getElementById('cartEmptyState');
    const footer = document.getElementById('cartFooter');
    const meterFill = document.getElementById('shippingMeterFill');
    const meterText = document.getElementById('shippingMeterText');

    if (!itemsContainer) return;

    if (STATE.cart.length === 0) {
      itemsContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      if (footer) footer.style.display = 'none';
      if (meterFill) meterFill.style.width = '0%';
      if (meterText) meterText.innerHTML = 'Add <strong>$150.00</strong> more for Free Courier Delivery';
      return;
    }

    itemsContainer.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (footer) footer.style.display = 'block';

    // Free shipping progress ($150 threshold)
    const threshold = 150;
    const progress = Math.min(100, (subtotal / threshold) * 100);
    if (meterFill) meterFill.style.width = `${progress}%`;
    if (meterText) {
      if (subtotal >= threshold) {
        meterText.innerHTML = '<span style="color:#059669; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Eligible for Complimentary Worldwide Delivery!</span>';
      } else {
        const remaining = (threshold - subtotal).toFixed(2);
        meterText.innerHTML = `Add <strong>$${remaining}</strong> more for Complimentary Delivery`;
      }
    }

    // Render items
    itemsContainer.innerHTML = STATE.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${item.image}" alt="${escapeHTML(item.title)}" />
        </div>
        <div class="cart-item-details">
          <h5>${escapeHTML(item.title)}</h5>
          <div class="cart-item-meta">Size: ${item.size} • $${item.price.toFixed(2)}</div>
          <div class="quantity-wrap">
            <button class="qty-btn" onclick="window.Stackly.updateCartQty(${item.id}, '${item.size}', -1)">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="window.Stackly.updateCartQty(${item.id}, '${item.size}', 1)">+</button>
          </div>
        </div>
        <div class="cart-item-controls">
          <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
          <button class="item-delete-btn" onclick="window.Stackly.deleteCartItem(${item.id}, '${item.size}')" title="Remove">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Summary
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');

    const shipping = subtotal >= threshold || subtotal === 0 ? 0 : 15;
    const orderTotal = subtotal + shipping;

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${orderTotal.toFixed(2)}`;
  }

  // =========================================================================
  // 12. WISHLIST FUNCTIONALITY (Drawer, Persistence, Move to Cart)
  // =========================================================================
  function initWishlistDrawer() {
    const wishlistBtn = document.getElementById('wishlistNavBtn');
    const drawer = document.getElementById('wishlistDrawer');
    const overlay = document.getElementById('wishlistDrawerOverlay');
    const closeBtn = document.getElementById('wishlistDrawerClose');

    function toggleWishlistDrawer(open) {
      if (open === undefined) open = !drawer.classList.contains('open');
      drawer.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }

    if (wishlistBtn) wishlistBtn.addEventListener('click', () => toggleWishlistDrawer(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleWishlistDrawer(false));
    if (overlay) overlay.addEventListener('click', () => toggleWishlistDrawer(false));

    updateWishlistUI();
  }

  function toggleWishlist(product) {
    const index = STATE.wishlist.findIndex(item => item.id === product.id);
    if (index > -1) {
      STATE.wishlist.splice(index, 1);
      showToast(`Removed "${product.title}" from Wishlist`, 'fa-solid fa-heart-crack');
    } else {
      STATE.wishlist.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.thumbnail || (product.images && product.images[0]) || 'assets/product-placeholder.webp',
        category: product.category
      });
      showToast(`Saved "${product.title}" to Wishlist!`, 'fa-solid fa-heart');
    }

    saveWishlist();
    syncWishlistButtons();

    // Bump Nav Badge
    const badge = document.getElementById('wishlistCountBadge');
    if (badge) {
      badge.classList.remove('bump');
      void badge.offsetWidth;
      badge.classList.add('bump');
    }
  }

  function syncWishlistButtons() {
    document.querySelectorAll('.wishlist-btn[data-product-id]').forEach(btn => {
      const pid = Number(btn.dataset.productId);
      const isWish = STATE.wishlist.some(i => i.id === pid);
      btn.classList.toggle('active', isWish);
      btn.innerHTML = `<i class="${isWish ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
    });
  }

  function updateWishlistUI() {
    const navBadge = document.getElementById('wishlistCountBadge');
    const headerCount = document.getElementById('wishlistDrawerCount');
    if (navBadge) navBadge.textContent = STATE.wishlist.length;
    if (headerCount) headerCount.textContent = STATE.wishlist.length;

    const itemsContainer = document.getElementById('wishlistItemsList');
    const emptyState = document.getElementById('wishlistEmptyState');
    if (!itemsContainer) return;

    if (STATE.wishlist.length === 0) {
      itemsContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    itemsContainer.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    itemsContainer.innerHTML = STATE.wishlist.map(item => `
      <div class="wishlist-item">
        <div class="cart-item-img">
          <img src="${item.image}" alt="${escapeHTML(item.title)}" />
        </div>
        <div class="cart-item-details">
          <h5>${escapeHTML(item.title)}</h5>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="wishlist-move-btn" onclick="window.Stackly.moveWishlistToCart(${item.id})">
            Move to Bag
          </button>
          <button class="item-delete-btn" onclick="window.Stackly.removeWishlistItem(${item.id})" title="Remove">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // 13. SPECIAL OFFERS (Live Countdown Timer & Coupon Code Copy)
  // =========================================================================
  function initSpecialOffers() {
    // Countdown Timer: 48h loop
    const daysEl = document.getElementById('offerDays');
    const hoursEl = document.getElementById('offerHours');
    const minutesEl = document.getElementById('offerMinutes');
    const secondsEl = document.getElementById('offerSeconds');

    // Target: 2 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);

    function updateTimer() {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;

      if (diff <= 0) {
        // Reset 48 hours for continuous luxury promotional experience
        targetDate.setDate(new Date().getDate() + 2);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    setInterval(updateTimer, 1000);
    updateTimer();

    // Copy Voucher Code
    const copyBtn = document.getElementById('copyCouponBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const code = 'STACKLY30';
        navigator.clipboard.writeText(code).then(() => {
          showToast('Coupon code STACKLY30 copied to clipboard!', 'fa-solid fa-tags');
          copyBtn.textContent = 'Copied! ✓';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Code';
          }, 2500);
        }).catch(() => {
          showToast('Use promo code: STACKLY30 at checkout', 'fa-solid fa-tags');
        });
      });
    }

    // 3 Images Separate into 4 Pieces & Join Together Animation
    const splitBtn = document.getElementById('splitJoinOffersBtn');
    const splitWraps = document.querySelectorAll('.offer-split-image');

    function triggerSplitJoinAnimation() {
      splitWraps.forEach(wrap => {
        wrap.classList.remove('splitting');
        void wrap.offsetWidth; // Force DOM reflow
        wrap.classList.add('splitting');
      });
    }

    if (splitBtn) {
      splitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerSplitJoinAnimation();
        showToast('3 Offer Images Separated into 4 Pieces & Joined Smoothly! ✨', 'fa-solid fa-puzzle-piece');
      });
    }

    // Scroll into view trigger via IntersectionObserver
    const offersSection = document.getElementById('offers');
    if ('IntersectionObserver' in window && offersSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            triggerSplitJoinAnimation();
          }
        });
      }, { threshold: 0.25 });

      observer.observe(offersSection);
    }
  }

  // =========================================================================
  // 14. NEWSLETTER SUBSCRIPTION VALIDATION
  // =========================================================================
  function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    const input = document.getElementById('newsletterEmail');
    const feedback = document.getElementById('newsletterFeedback');

    if (!form || !input) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = input.value.trim();

      // Email Regex validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email) {
        if (feedback) {
          feedback.textContent = 'Please enter your email address.';
          feedback.className = 'newsletter-feedback error';
        }
        input.focus();
        return;
      }

      if (!emailPattern.test(email)) {
        if (feedback) {
          feedback.textContent = 'Please provide a valid luxury email address.';
          feedback.className = 'newsletter-feedback error';
        }
        input.focus();
        return;
      }

      // Success
      if (feedback) {
        feedback.textContent = 'Welcome to the Atelier! Check your inbox for your 15% VIP invitation.';
        feedback.className = 'newsletter-feedback success';
      }
      showToast('Thank you for subscribing to Stackly Atelier!', 'fa-solid fa-envelope-circle-check');
      input.value = '';
    });
  }

  // =========================================================================
  // 15. INFORMATIONAL MODALS (Customer Support & Checkout)
  // =========================================================================
  const POLICIES = {
    'shipping': {
      title: 'Complimentary Worldwide Courier Delivery',
      content: `
        <p>Stackly Boutique partners with premium global white-glove couriers (DHL Express, FedEx Priority) to ensure your pieces arrive in pristine condition.</p>
        <p><strong>Domestic Orders:</strong> 1-2 business days with complimentary tracking.</p>
        <p><strong>International Orders:</strong> 3-5 business days. All duties, import taxes, and custom clearances are calculated and settled upfront with no unexpected charges.</p>
        <p>Complimentary delivery applies automatically to all orders exceeding $150.</p>
      `
    },
    'returns': {
      title: '30-Day Atelier Return & Exchange Policy',
      content: `
        <p>We want every garment in your wardrobe to be treasured. If your piece does not fit flawlessly, Stackly offers complimentary returns within 30 days of delivery.</p>
        <p>Items must remain unworn, unaltered, with original designer garment tags and luxury packaging intact.</p>
        <p>To arrange a courier collection from your residence or office, simply contact our 24/7 client concierge at concierge@stacklyboutique.com.</p>
      `
    },
    'privacy': {
      title: 'Atelier Privacy & Discretion Guarantee',
      content: `
        <p>At Stackly, the privacy and confidentiality of our clientele are paramount. We utilize 256-bit SSL encryption to safeguard all transactions and personal data.</p>
        <p>We never sell, rent, or distribute personal information to third-party marketing services. Your bespoke measurements and style preferences are retained exclusively for tailoring recommendations.</p>
      `
    },
    'terms': {
      title: 'Terms of Haute Couture Service',
      content: `
        <p>By engaging with Stackly Online Boutique, you enter into our client atelier charter. All designs, garment photography, and brand assets are intellectual property of Stackly Boutique.</p>
        <p>Prices are listed in USD and include all applicable luxury apparel duties for specified regions. Orders are subject to verification and boutique stock confirmation.</p>
      `
    },
    'contact': {
      title: 'Contact The Stackly Concierge',
      content: `
        <p>Our dedicated personal stylists and customer concierges are available 7 days a week to assist you with sizing advice, bespoke styling, or order tracking.</p>
        <p><strong>Flagship Boutique:</strong> 742 Fifth Avenue, Fashion District, New York, NY 10019</p>
        <p><strong>Direct Concierge:</strong> +1 (800) 782-2559</p>
        <p><strong>Email:</strong> concierge@stacklyboutique.com</p>
        <p><strong>Hours:</strong> Mon – Sat: 9:00 AM – 8:00 PM | Sun: 11:00 AM – 6:00 PM EST</p>
      `
    },
    'payment': {
      title: 'Guaranteed Secure Atelier Payment Protection',
      content: `
        <p>Stackly Boutique employs bank-grade, PCI-DSS Level 1 compliant financial encryption to guarantee that every acquisition on our homepage is completely protected.</p>
        <p><strong>Accepted Payment Gateways:</strong> Visa, Mastercard, American Express, Apple Pay, and PayPal.</p>
        <p><strong>Security Protocols:</strong> Full 256-bit TLS/SSL encryption with automated fraud protection and tokenized transaction handshakes.</p>
        <p><strong>Buyer Protection:</strong> Comprehensive purchase coverage, verified authenticity certificates, and instant order tracking dispatched straight to your email.</p>
        <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="policyOpenCartBtn">
            <i class="fa-solid fa-bag-shopping"></i> View Shopping Bag &amp; Checkout
          </button>
        </div>
      `
    },
    'size-guide': {
      title: 'Haute Couture Atelier Sizing Guide',
      content: `
        <p>Stackly garments follow standard French and Italian haute couture sizing conventions with tailored ease.</p>
        <table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:0.85rem;">
          <thead>
            <tr style="border-bottom:2px solid var(--primary-orange); text-align:left;">
              <th style="padding:8px;">Size</th>
              <th style="padding:8px;">Bust (in)</th>
              <th style="padding:8px;">Waist (in)</th>
              <th style="padding:8px;">Hips (in)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;"><strong>XS</strong> (US 0-2)</td><td style="padding:8px;">32 - 33</td><td style="padding:8px;">24 - 25</td><td style="padding:8px;">34 - 35</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;"><strong>S</strong> (US 4-6)</td><td style="padding:8px;">34 - 35</td><td style="padding:8px;">26 - 27</td><td style="padding:8px;">36 - 37</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;"><strong>M</strong> (US 8-10)</td><td style="padding:8px;">36 - 37</td><td style="padding:8px;">28 - 29</td><td style="padding:8px;">38 - 39</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;"><strong>L</strong> (US 12-14)</td><td style="padding:8px;">38 - 40</td><td style="padding:8px;">30 - 32</td><td style="padding:8px;">40 - 42</td></tr>
            <tr><td style="padding:8px;"><strong>XL</strong> (US 16)</td><td style="padding:8px;">41 - 43</td><td style="padding:8px;">33 - 35</td><td style="padding:8px;">43 - 45</td></tr>
          </tbody>
        </table>
        <p style="margin-top:14px; font-size:0.8rem; color:var(--text-secondary);">Need personal fit recommendations? Connect directly with our concierge team.</p>
      `
    }
  };

  function initInfoModals() {
    const modal = document.getElementById('infoModalOverlay');
    const closeBtn = document.getElementById('infoModalClose');
    const titleEl = document.getElementById('infoModalTitle');
    const contentEl = document.getElementById('infoModalContent');

    function close() {
      if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      }
    }

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });
    }

    document.querySelectorAll('[data-policy]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const policyKey = btn.dataset.policy;
        const policy = POLICIES[policyKey];
        if (policy && modal && titleEl && contentEl) {
          titleEl.textContent = policy.title;
          contentEl.innerHTML = policy.content;
          modal.classList.add('open');
          document.body.style.overflow = 'hidden';

          // Bind internal modal action if present
          const openBagBtn = document.getElementById('policyOpenCartBtn');
          if (openBagBtn) {
            openBagBtn.addEventListener('click', () => {
              close();
              toggleCartDrawer(true);
            });
          }
        }
      });
    });
  }

  // =========================================================================
  // 15B. SOCIAL LINKS (Within Homepage Navigation & Community Feedback)
  // =========================================================================
  function initSocialLinks() {
    document.querySelectorAll('.social-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const network = link.getAttribute('data-social') || 'Social';
        const prettyNames = {
          'instagram': 'Instagram (@StacklyBoutique)',
          'facebook': 'Facebook (@StacklyCouture)',
          'x-twitter': 'X / Twitter (@Stackly_Style)',
          'linkedin': 'LinkedIn (Stackly Fashion Group)',
          'pinterest': 'Pinterest (@StacklyLookbook)'
        };
        const displayName = prettyNames[network] || 'Social Community';

        // Smooth scroll to the Private Circle / Newsletter section on the homepage
        const newsletterSection = document.getElementById('newsletter');
        if (newsletterSection) {
          const navOffset = 76;
          const elementPosition = newsletterSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          // Focus the newsletter email input to invite them to join the private circle
          setTimeout(() => {
            const emailInput = document.getElementById('newsletterEmail');
            if (emailInput) {
              emailInput.focus();
              emailInput.classList.add('pulse-focus');
              setTimeout(() => emailInput.classList.remove('pulse-focus'), 1600);
            }
          }, 600);
        }

        showToast(`Connected to ${displayName} within Atelier Homepage! ✨`, 'fa-solid fa-circle-check');
      });
    });
  }

  function openCheckoutSuccessModal() {
    const modal = document.getElementById('checkoutModalOverlay');
    const closeBtn = document.getElementById('checkoutModalClose');
    const orderNumEl = document.getElementById('checkoutOrderNumber');

    const randomOrder = 'STK-' + Math.floor(100000 + Math.random() * 900000);
    if (orderNumEl) orderNumEl.textContent = randomOrder;

    // Clear cart
    STATE.cart = [];
    saveCart();

    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      }
    }

    if (closeBtn) closeBtn.onclick = close;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) close();
      };
    }
  }

  // =========================================================================
  // 16. GLOBAL CARD ACTION DELEGATION
  // =========================================================================
  function initGlobalCardEvents() {
    document.addEventListener('click', (e) => {
      // 1. Wishlist toggle button click
      const wishBtn = e.target.closest('[data-action="wishlist"]');
      if (wishBtn) {
        e.preventDefault();
        e.stopPropagation();
        const pid = Number(wishBtn.dataset.productId);
        const all = [...STATE.products, ...STATE.fashionProducts];
        const product = all.find(p => p.id === pid);
        if (product) toggleWishlist(product);
        return;
      }

      // 2. Add to Cart button click
      const addBtn = e.target.closest('[data-action="add-cart"]');
      if (addBtn) {
        e.preventDefault();
        e.stopPropagation();
        const pid = Number(addBtn.dataset.productId);
        const all = [...STATE.products, ...STATE.fashionProducts];
        const product = all.find(p => p.id === pid);
        if (product) addToCart(product, 1, 'M');
        return;
      }

      // 3. Quick View / Product click
      const quickBtn = e.target.closest('[data-action="quickview"]');
      if (quickBtn) {
        e.preventDefault();
        const pid = Number(quickBtn.dataset.productId);
        openProductModal(pid);
        return;
      }
    });
  }

  // =========================================================================
  // 17. PUBLIC API FOR INLINE HANDLERS
  // =========================================================================
  window.Stackly = {
    updateCartQty: (id, size, change) => updateCartItemQty(id, size, change),
    deleteCartItem: (id, size) => removeCartItem(id, size),
    moveWishlistToCart: (id) => {
      const wishItem = STATE.wishlist.find(i => i.id === id);
      if (wishItem) {
        addToCart(wishItem, 1, 'M');
        toggleWishlist(wishItem);
      }
    },
    removeWishlistItem: (id) => {
      const wishItem = STATE.wishlist.find(i => i.id === id);
      if (wishItem) toggleWishlist(wishItem);
    }
  };

  // =========================================================================
  // 17. HERO LIVE BACKGROUND RUNNER (5 Images, 2-Second Gap)
  // =========================================================================
  function initHeroLiveSlider() {
    const slides = document.querySelectorAll('.hero-bg-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const slideNumber = document.getElementById('heroSlideNumber');
    const visualImg = document.getElementById('heroVisualImg');
    if (!slides.length) return;

    const heroImages = [
      'assets/hero-bg-1.webp',
      'assets/hero-bg-2.webp',
      'assets/hero-bg-3.webp',
      'assets/hero-bg-4.webp',
      'assets/hero-bg-5.webp'
    ];

    let currentSlide = 0;
    let slideTimer = null;

    function goToSlide(index) {
      currentSlide = (index + slides.length) % slides.length;

      // Update background slides
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === currentSlide);
      });

      // Update dot indicators
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
      });

      // Update slide number display
      if (slideNumber) {
        slideNumber.textContent = `0${currentSlide + 1} / 0${slides.length}`;
      }

      // Synchronize visual frame image smoothly
      if (visualImg && heroImages[currentSlide]) {
        visualImg.style.opacity = '0.5';
        setTimeout(() => {
          visualImg.src = heroImages[currentSlide];
          visualImg.style.opacity = '1';
        }, 120);
      }
    }

    function startTimer() {
      stopTimer();
      slideTimer = setInterval(() => {
        goToSlide(currentSlide + 1);
      }, 2000); // 2 seconds continuous live gap of time
    }

    function stopTimer() {
      if (slideTimer) {
        clearInterval(slideTimer);
        slideTimer = null;
      }
    }

    // Allow user click on dots to inspect a specific slide
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const slideIdx = Number(dot.dataset.slide);
        goToSlide(slideIdx);
        startTimer();
      });
    });

    // Start 2-second continuous live runner
    startTimer();
  }

  // =========================================================================
  // 18. LETTER-BY-LETTER HEADING ANIMATION (ARRANGE FROM RIGHT SIDE)
  // =========================================================================
  function initHeadingLetterAnimation() {
    const headings = document.querySelectorAll('.hero-title, .section-title, .newsletter-title');
    if (!headings.length) return;

    headings.forEach(heading => {
      // Save accessible text for screen readers
      const fullText = heading.textContent.replace(/\s+/g, ' ').trim();
      heading.setAttribute('aria-label', fullText);

      let charCounter = 0;

      function splitText(text) {
        const fragment = document.createDocumentFragment();
        const tokens = text.split(/(\s+)/);

        tokens.forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) {
            // Keep pure whitespace between words
            fragment.appendChild(document.createTextNode(' '));
          } else {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'anim-word';
            for (let i = 0; i < tok.length; i++) {
              const charSpan = document.createElement('span');
              charSpan.className = 'anim-char';
              charSpan.textContent = tok[i];
              charSpan.style.setProperty('--char-idx', charCounter++);
              wordSpan.appendChild(charSpan);
            }
            fragment.appendChild(wordSpan);
          }
        });
        return fragment;
      }

      function parseNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return splitText(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const clone = node.cloneNode(false);
          clone.classList.add('anim-group');
          node.childNodes.forEach(child => {
            clone.appendChild(parseNode(child));
          });
          return clone;
        }
        return node.cloneNode(true);
      }

      const newContent = document.createDocumentFragment();
      heading.childNodes.forEach(child => {
        newContent.appendChild(parseNode(child));
      });

      heading.innerHTML = '';
      heading.appendChild(newContent);
      heading.classList.add('letter-anim-ready');
    });

    // IntersectionObserver to trigger animation when heading scrolls into view
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('letter-anim-play');
          }
        });
      }, { threshold: 0.15 });

      headings.forEach(h => observer.observe(h));
    } else {
      headings.forEach(h => h.classList.add('letter-anim-play'));
    }

    // Immediately animate hero title after preloader unfastening
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
      setTimeout(() => {
        heroTitle.classList.add('letter-anim-play');
      }, 700);
    }
  }

  // =========================================================================
  // 19. INITIALIZATION
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initHeroLiveSlider();
    initHeadingLetterAnimation();
    initNavigation();
    initCategoryClicks();
    initNewArrivalsShuffle();
    initCollectionControls();
    initProductModal();
    initCartDrawer();
    initWishlistDrawer();
    initSpecialOffers();
    initNewsletter();
    initInfoModals();
    initSocialLinks();
    initGlobalCardEvents();

    // Fetch dynamic products from DummyJSON API
    fetchProductsFromAPI();
  });

})();
