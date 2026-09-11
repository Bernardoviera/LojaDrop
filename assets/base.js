/* LojaDrop Theme — base.js */

'use strict';

// ─── Header height CSS variable ────────────────────────────────────
const siteHeader = document.querySelector('.site-header');
const announcementBarSection = document.querySelector('.announcement-bar-section');

function syncHeaderHeight() {
  if (siteHeader) {
    const headerH = siteHeader.offsetHeight;
    document.documentElement.style.setProperty('--header-height', headerH + 'px');
    const barH = announcementBarSection ? announcementBarSection.offsetHeight : 0;
    document.documentElement.style.setProperty('--topbar-total-height', (headerH + barH) + 'px');
  }
}
syncHeaderHeight();
window.addEventListener('resize', syncHeaderHeight, { passive: true });
window.addEventListener('load', syncHeaderHeight);
document.fonts.ready.then(syncHeaderHeight);
if (siteHeader) new ResizeObserver(syncHeaderHeight).observe(siteHeader);

// ─── Header scroll effect ──────────────────────────────────────────
if (siteHeader) {
  const heroSection = document.querySelector('.hero-section');

  if (heroSection && document.body.classList.contains('template-index')) {
    const observer = new IntersectionObserver(
      entries => siteHeader.classList.toggle('scrolled', !entries[0].isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(heroSection);
  } else {
    const updateScrolled = () => siteHeader.classList.toggle('scrolled', window.scrollY > 10);
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
  }
}

// ─── Mobile nav ───────────────────────────────────────────────────────
function initMobileNav() {
  const hamburger = document.querySelector('.header__hamburger');
  const mobileNav  = document.querySelector('.mobile-nav');
  const mobileClose = document.querySelector('.mobile-nav__close');
  if (!hamburger || !mobileNav || hamburger._navInit) return;
  hamburger._navInit = true;

  const openNav = () => {
    mobileNav.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.setAttribute('aria-hidden', 'false');
  };

  const closeNav = () => {
    mobileNav.classList.remove('is-open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.setAttribute('aria-hidden', 'true');
  };

  hamburger.addEventListener('click', openNav);
  if (mobileClose) mobileClose.addEventListener('click', closeNav);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
}
initMobileNav();

// ─── Cart Drawer ───────────────────────────────────────────────────────────
class CartDrawer {
  constructor() {
    this.drawer = document.querySelector('.cart-drawer');
    this.overlay = document.querySelector('.cart-drawer-overlay');
    this.closeBtn = document.querySelector('.cart-drawer__close');

    if (!this.drawer) return;
    this.bindEvents();
    this.bindCartItemEvents();
  }

  bindEvents() {
    document.addEventListener('click', e => {
      if (e.target.closest('[data-open-cart]')) this.open();
    });
    if (this.overlay) this.overlay.addEventListener('click', () => this.close());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  }

  open() {
    this.drawer.classList.add('is-open');
    if (this.overlay) this.overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    this.fetchCart();
  }

  close() {
    this.drawer.classList.remove('is-open');
    if (this.overlay) this.overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  async fetchCart() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      this.renderDrawer(cart);
    } catch (e) {
      console.error('Cart fetch error:', e);
    }
  }

  renderDrawer(cart) {
    const itemsContainer = this.drawer.querySelector('.cart-drawer__items');
    const subtotalEl = this.drawer.querySelector('.cart-drawer__subtotal-value');
    if (!itemsContainer) return;

    if (cart.item_count === 0) {
      itemsContainer.innerHTML = `<p style="padding:2rem 0;text-align:center;color:rgba(var(--color-base-text),0.6)">${window.cartStrings?.empty || 'Seu carrinho está vazio.'}</p>`;
    } else {
      itemsContainer.innerHTML = cart.items.map(item => `
        <div class="cart-item">
          <div class="cart-item__media">
            <img src="${item.image}" alt="${item.title}" loading="lazy">
          </div>
          <div class="cart-item__info">
            <div class="cart-item__title">${item.product_title}</div>
            ${item.variant_title !== 'Default Title' ? `<div class="cart-item__variant">${item.variant_title}</div>` : ''}
            <div class="cart-item__price">${this.formatMoney(item.final_line_price)}</div>
            <div style="display:flex;align-items:center;gap:1.2rem;margin-top:0.8rem;">
              <div class="quantity-selector" style="transform:scale(0.9);transform-origin:left">
                <button class="quantity-btn" data-action="decrease" data-key="${item.key}">−</button>
                <input class="quantity-input" type="number" value="${item.quantity}" min="1" data-key="${item.key}" style="width:4rem">
                <button class="quantity-btn" data-action="increase" data-key="${item.key}">+</button>
              </div>
              <button class="cart-item__remove" data-key="${item.key}">${window.cartStrings?.remove || 'Remover'}</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = this.formatMoney(cart.total_price);

    const titleEl = this.drawer.querySelector('.cart-drawer__title');
    if (titleEl) titleEl.textContent = `${window.cartStrings?.title || 'Carrinho'} (${cart.item_count})`;
  }

  bindCartItemEvents() {
    const itemsContainer = this.drawer.querySelector('.cart-drawer__items');
    if (!itemsContainer) return;

    itemsContainer.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      const removeBtn = e.target.closest('.cart-item__remove');

      if (btn) {
        const key = btn.dataset.key;
        const input = itemsContainer.querySelector(`.quantity-input[data-key="${key}"]`);
        if (!input) return;
        let qty = parseInt(input.value);
        qty = btn.dataset.action === 'increase' ? qty + 1 : Math.max(0, qty - 1);
        btn.disabled = true;
        try {
          await this.updateItem(key, qty);
        } finally {
          btn.disabled = false;
        }
      }

      if (removeBtn) {
        removeBtn.disabled = true;
        await this.updateItem(removeBtn.dataset.key, 0);
      }
    });
  }

  async updateItem(key, quantity) {
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: key, quantity })
      });
      const cart = await res.json();
      this.renderDrawer(cart);
      updateCartCount(cart.item_count);
    } catch (e) {
      console.error('Update cart error:', e);
      showToast(window.cartStrings?.error || 'Erro ao atualizar carrinho.', 'error');
    }
  }

  formatMoney(cents) {
    // Prefer window.Shopify.money_format which respects active currency in multi-currency stores
    const fmt = (window.Shopify && window.Shopify.money_format)
      || window.moneyFormat
      || '€{{amount}}';
    const amount = (cents / 100).toFixed(2).replace('.', ',');
    return fmt
      .replace('{{amount_with_comma_separator}}', amount)
      .replace('{{amount_no_decimals_with_comma_separator}}', Math.round(cents / 100).toString())
      .replace('{{amount_no_decimals}}', Math.round(cents / 100).toString())
      .replace('{{amount}}', amount);
  }
}

// ─── Cart count update ───────────────────────────────────────────────────────
function updateCartCount(count) {
  document.querySelectorAll('.cart-count-bubble').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ─── Add to cart ───────────────────────────────────────────────────────────
async function addToCart(variantId, quantity = 1) {
  try {
    const res = await fetch(window.routes.cart_add_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity })
    });

    if (!res.ok) throw new Error('Erro ao adicionar ao carrinho');

    await res.json();

    const cartRes = await fetch('/cart.js');
    const cart = await cartRes.json();
    updateCartCount(cart.item_count);

    if (document.querySelector('.cart-drawer')) {
      window.cartDrawer?.open();
    }

    showToast(window.cartStrings?.added || 'Produto adicionado ao carrinho!');
  } catch (e) {
    showToast(window.cartStrings?.error || 'Erro ao adicionar ao carrinho.', 'error');
    throw e;
  }
}

// ─── Toast notification ───────────────────────────────────────────────────────
function showToast(message, type = '') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast' + (type ? ' toast--' + type : '') + ' is-visible';
  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

// ─── Product page variant picker ────────────────────────────────────────────
class VariantPicker {
  constructor(form) {
    this.form = form;
    const jsonEl = form.querySelector('[data-product-variants]');
    this.variants = JSON.parse(
      jsonEl ? jsonEl.textContent : (form.dataset.variants || '[]')
    );
    this.currentVariant = this.variants[0] || null;
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    this.form.querySelectorAll('.variant-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const option = btn.dataset.option;
        this.form.querySelectorAll(`.variant-opt[data-option="${option}"]`).forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        this.updateVariant();
      });
    });

    const addBtn = this.form.querySelector('[data-add-to-cart]');
    if (addBtn) {
      this.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.currentVariant || !this.currentVariant.available) return;
        const qty = parseInt(this.form.querySelector('.quantity-input')?.value || 1);
        addBtn.disabled = true;
        addBtn.textContent = window.variantStrings?.adding || 'Adicionando...';
        try {
          await addToCart(this.currentVariant.id, qty);
        } finally {
          addBtn.disabled = false;
          addBtn.textContent = window.variantStrings?.addToCart || 'Adicionar ao carrinho';
        }
      });
    }
  }

  updateVariant() {
    const selected = {};
    this.form.querySelectorAll('.variant-opt.is-selected').forEach(btn => {
      selected[btn.dataset.option] = btn.dataset.value;
    });

    this.currentVariant = this.variants.find(v =>
      v.options.every((val, i) => selected[`option${i + 1}`] === val)
    ) || null;

    this.updateUI();
  }

  updateUI() {
    const priceEl = this.form.closest('.product-info')?.querySelector('.product-info__price');
    const addBtn  = this.form.querySelector('[data-add-to-cart]');

    if (!this.currentVariant) {
      if (addBtn) { addBtn.disabled = true; addBtn.textContent = window.variantStrings?.unavailable || 'Indisponível'; }
      return;
    }

    if (priceEl) {
      if (this.currentVariant.compare_at_price > this.currentVariant.price) {
        priceEl.innerHTML = `
          <span class="price__sale">${window.cartDrawer?.formatMoney(this.currentVariant.price) || ''}</span>
          <span class="price__compare">${window.cartDrawer?.formatMoney(this.currentVariant.compare_at_price) || ''}</span>
        `;
      } else {
        priceEl.innerHTML = `<span class="price__regular">${window.cartDrawer?.formatMoney(this.currentVariant.price) || ''}</span>`;
      }
    }

    if (addBtn) {
      addBtn.disabled = !this.currentVariant.available;
      addBtn.textContent = this.currentVariant.available
        ? (window.variantStrings?.addToCart || 'Adicionar ao carrinho')
        : (window.variantStrings?.soldOut || 'Esgotado');
    }

    const url = new URL(window.location.href);
    url.searchParams.set('variant', this.currentVariant.id);
    window.history.replaceState({}, '', url.toString());
  }
}

// ─── Product media gallery ───────────────────────────────────────────────────
class ProductGallery {
  constructor(gallery) {
    this.main   = gallery.querySelector('.product-media__main img');
    this.thumbs = gallery.querySelectorAll('.product-media__thumb');
    this.bindEvents();
  }

  bindEvents() {
    this.thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const fullSrc = thumb.dataset.full || thumb.querySelector('img').src;
        if (this.main) this.main.src = fullSrc;
        this.thumbs.forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });
  }
}

// ─── Quantity selectors (outside cart drawer) ────────────────────────────────────
function initQuantitySelectors(root = document) {
  root.querySelectorAll('.quantity-selector').forEach(selector => {
    if (selector.closest('.cart-drawer') || selector._qtyInit) return;
    selector._qtyInit = true;
    selector.addEventListener('click', e => {
      const btn = e.target.closest('.quantity-btn');
      if (!btn) return;
      const input = selector.querySelector('.quantity-input');
      let val = parseInt(input.value) || 1;
      val = (btn.textContent.trim() === '+' || btn.dataset.action === 'increase') ? val + 1 : Math.max(1, val - 1);
      input.value = val;
    });
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.cartDrawer = new CartDrawer();

  document.querySelectorAll('.product-form').forEach(form => {
    if (form.querySelector('[data-product-variants]') || form.dataset.variants) {
      new VariantPicker(form);
    }
  });

  document.querySelectorAll('.product-media-gallery').forEach(gallery => {
    new ProductGallery(gallery);
  });

  initQuantitySelectors();

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-quick-add]');
    if (!btn || btn._qaRunning) return;
    e.preventDefault();
    btn._qaRunning = true;
    const variantId = btn.dataset.quickAdd;
    const orig = btn.textContent;
    btn.textContent = '...';
    try {
      await addToCart(variantId);
      btn.textContent = 'Adicionado!';
      setTimeout(() => { btn.textContent = orig; btn._qaRunning = false; }, 2000);
    } catch {
      btn.textContent = 'Error';
      setTimeout(() => { btn.textContent = orig; btn._qaRunning = false; }, 2000);
    }
  });
});

// ─── Shopify Theme Editor re-init ──────────────────────────────────────────────
document.addEventListener('shopify:section:load', (event) => {
  syncHeaderHeight();
  initMobileNav();

  const section = event.target;

  if (section.querySelector('.cart-drawer')) {
    window.cartDrawer = new CartDrawer();
  }

  section.querySelectorAll?.('.product-form').forEach(form => {
    const hasV = form.querySelector('[data-product-variants]') || form.dataset.variants;
    if (hasV && !form._picker) form._picker = new VariantPicker(form);
  });

  section.querySelectorAll?.('.product-media-gallery').forEach(gallery => {
    if (!gallery._gallery) gallery._gallery = new ProductGallery(gallery);
  });

  initQuantitySelectors(section);
});
