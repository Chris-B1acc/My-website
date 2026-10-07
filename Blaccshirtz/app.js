(() => {
  "use strict";

  const config = window.STORE_CONFIG || {};
  const productSlots = new Set((document.querySelector("#product-grid")?.dataset.productIds || "").split(/\s+/).filter(Boolean));
  const catalog = Array.isArray(window.PRODUCTS)
    ? window.PRODUCTS.filter(isProduct).filter((product) => productSlots.has(product.id))
    : [];
  const currency = typeof config.currency === "string" ? config.currency : "USD";
  const cartKey = "blaccshirtz-cart-v1";
  const byId = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat(undefined, { style: "currency", currency });
  let cart = loadCart();
  let toastTimer;

  function isProduct(item) {
    return item && typeof item.id === "string" && item.id &&
      typeof item.name === "string" && item.name &&
      Number.isFinite(Number(item.price)) && Number(item.price) >= 0 &&
      typeof item.description === "string" &&
      typeof item.image === "string" && item.image &&
      typeof item.category === "string" &&
      Array.isArray(item.sizes);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function safeImageUrl(value) {
    const url = String(value || "").trim();
    if (/^(https?:\/\/|\.\.?\/|\/|images\/)/i.test(url)) return url;
    return "";
  }

  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(cartKey) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((entry) => {
        const product = catalog.find((item) => item.id === entry.id);
        const hasValidSize = product && (product.sizes.length ? product.sizes.includes(entry.size) : entry.size === "");
        return hasValidSize && Number.isInteger(entry.quantity) && entry.quantity > 0;
      }).map((entry) => ({ id: entry.id, size: entry.size, quantity: Math.min(entry.quantity, 99) }));
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    renderCart();
    updateCartCount();
  }

  function formatPrice(value) {
    try { return money.format(Number(value)).replace("GHS", "GH₵"); }
    catch { return `${currency} ${Number(value).toFixed(2)}`; }
  }

  function imageMarkup(product, className, alt) {
    const image = safeImageUrl(product.image);
    return image
      ? `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(alt || product.name)}" loading="lazy" decoding="async">`
      : `<div class="${className}" role="img" aria-label="Product image not configured"></div>`;
  }

  function productCard(product) {
    const sizes = product.sizes.filter((size) => typeof size === "string" && size.trim());
    return `<article class="product-card">
      <div class="product-visual">
        ${imageMarkup(product, "", product.name)}
        ${product.arrival ? '<span class="product-badge">NEW ARRIVAL</span>' : ""}
      </div>
      <div class="product-card-details">
        <div class="product-title-row"><h3>${escapeHtml(product.name)}</h3><span class="product-price">${formatPrice(product.price)}</span></div>
        <p class="product-description">${escapeHtml(product.description)}</p>
        <p class="product-sizes">SIZES / ${sizes.map(escapeHtml).join(" · ") || "NOT LISTED"}</p>
        ${sizes.length ? `<div class="product-card-size-picker">
          <label class="visually-hidden" for="size-${escapeHtml(product.id)}">Select size for ${escapeHtml(product.name)}</label>
          <select class="card-size-selector" id="size-${escapeHtml(product.id)}" data-size-select="${escapeHtml(product.id)}" aria-label="Select size for ${escapeHtml(product.name)}">
            ${sizes.map((size) => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join("")}
          </select>
        </div>` : ""}
        <div class="product-card-actions">
          <button class="card-add" type="button" data-add="${escapeHtml(product.id)}">ADD TO BAG</button>
          <button class="card-view" type="button" data-view="${escapeHtml(product.id)}">VIEW PRODUCT</button>
        </div>
      </div>
    </article>`;
  }

  function emptyState(title, copy, link = true) {
    return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p>${link ? '<a class="text-link" href="#contact">GET IN TOUCH <span aria-hidden="true">↗</span></a>' : ""}</div>`;
  }

  function renderCategories() {
    const select = byId("category-filter");
    const categories = [...new Set(catalog.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="all">ALL CATEGORIES</option>' + categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category.toUpperCase())}</option>`).join("");
  }

  function filteredProducts() {
    const term = byId("product-search").value.trim().toLowerCase();
    const category = byId("category-filter").value;
    const sort = byId("sort-products").value;
    const result = catalog.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const searchable = `${product.name} ${product.description} ${product.category}`.toLowerCase();
      return matchesCategory && searchable.includes(term);
    });
    if (sort === "name-asc") result.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price-asc") result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-desc") result.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "featured") result.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return result;
  }

  function renderShop() {
    const products = filteredProducts();
    byId("collection-count").textContent = `${String(catalog.length).padStart(2, "0")} PIECES / 01 ATTITUDE`;
    byId("results-count").textContent = `${products.length} ${products.length === 1 ? "PIECE" : "PIECES"}`;
    byId("product-grid").innerHTML = products.length
      ? products.map(productCard).join("")
      : catalog.length
        ? emptyState("NO MATCHES FOUND.", "Try another search or category.", false)
        : emptyState("THE COLLECTION IS COMING INTO FOCUS.", "The official products, images, descriptions, and prices have not been added yet. Once ready, add them to products.js and the shop will populate automatically.");
  }

  function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach((node) => { node.textContent = String(count); });
  }

  function cartProduct(entry) {
    return catalog.find((product) => product.id === entry.id);
  }

  function subtotal() {
    return cart.reduce((total, entry) => total + Number(cartProduct(entry)?.price || 0) * entry.quantity, 0);
  }

  function renderCart() {
    const container = byId("cart-items");
    const empty = cart.length === 0;
    byId("cart-empty").hidden = !empty;
    container.hidden = empty;
    byId("cart-subtotal").textContent = formatPrice(subtotal());
    byId("cart-items").innerHTML = empty ? "" : cart.map((entry) => {
      const product = cartProduct(entry);
      if (!product) return "";
      return `<article class="cart-line">
        ${imageMarkup(product, "", product.name)}
        <div class="cart-line-info"><h3>${escapeHtml(product.name)}</h3><p>${entry.size ? `SIZE / ${escapeHtml(entry.size)}` : "SIZE / NOT PROVIDED"}</p><div class="quantity-control" aria-label="Quantity for ${escapeHtml(product.name)}">
          <button type="button" data-quantity="-1" data-id="${escapeHtml(entry.id)}" data-size="${escapeHtml(entry.size)}" aria-label="Decrease quantity">−</button><span>${entry.quantity}</span><button type="button" data-quantity="1" data-id="${escapeHtml(entry.id)}" data-size="${escapeHtml(entry.size)}" aria-label="Increase quantity">+</button>
        </div></div><div class="cart-line-end"><strong>${formatPrice(Number(product.price) * entry.quantity)}</strong><button type="button" class="remove-item" data-remove="${escapeHtml(entry.id)}" data-size="${escapeHtml(entry.size)}">REMOVE</button></div>
      </article>`;
    }).join("");
    byId("cart-subtotal").textContent = formatPrice(subtotal());
    byId("checkout-start").disabled = empty;
    renderCheckoutSummary();
  }

  function renderCheckoutSummary() {
    const summary = byId("checkout-items");
    if (!summary) return;
    summary.innerHTML = cart.map((entry) => {
      const product = cartProduct(entry);
      if (!product) return "";
      return `<div class="checkout-summary-line"><span>${escapeHtml(product.name)}${entry.size ? ` · ${escapeHtml(entry.size)}` : ""} × ${entry.quantity}</span><strong>${formatPrice(Number(product.price) * entry.quantity)}</strong></div>`;
    }).join("");
    byId("checkout-total").textContent = formatPrice(subtotal());
  }

  function addToCart(productId, size, quantity = 1) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;
    const selectedSize = product.sizes.length ? size : "";
    if (product.sizes.length && !product.sizes.includes(selectedSize)) return;
    const existing = cart.find((entry) => entry.id === productId && entry.size === selectedSize);
    if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
    else cart.push({ id: productId, size: selectedSize, quantity: Math.min(99, quantity) });
    saveCart();
    showToast(`${product.name} added to your bag.`);
  }

  function showToast(message) {
    const toast = byId("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function openProduct(productId, updateHistory = true) {
    const product = catalog.find((item) => item.id === productId);
    if (!product) return;
    const dialog = byId("product-dialog");
    const sizes = product.sizes.filter((size) => typeof size === "string" && size.trim());
    const related = catalog.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 3);
    const content = byId("product-detail-content");
    content.innerHTML = `<div class="product-detail">
      ${imageMarkup(product, "product-detail-image", product.name)}
      <div class="product-detail-copy"><p class="eyebrow">${escapeHtml(product.category.toUpperCase())} / BLACCSHIRTZ</p><h2 id="product-dialog-title">${escapeHtml(product.name)}</h2><div class="product-detail-price">${formatPrice(product.price)}</div><p class="product-detail-description">${escapeHtml(product.description)}</p>
      ${sizes.length ? `<label for="product-size">SELECT SIZE</label><select id="product-size">${sizes.map((size) => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join("")}</select>` : '<p class="size-note">SIZE OPTIONS NOT PROVIDED</p>'}
      <label for="product-quantity">QUANTITY</label><input id="product-quantity" class="quantity-control" type="number" min="1" max="99" value="1">
      <div class="detail-actions"><button class="button button-light" type="button" data-detail-add="${escapeHtml(product.id)}">ADD TO BAG</button><button class="card-view" type="button" data-buy-now="${escapeHtml(product.id)}">BUY NOW ↗</button></div>
      ${related.length ? `<div class="detail-related"><p>YOU MAY ALSO LIKE</p><div class="related-list">${related.map((item) => `<button type="button" data-view="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`).join("")}</div></div>` : ""}
      </div></div>`;
    if (!dialog.open) dialog.showModal();
    if (updateHistory) history.pushState({ productId }, "", `#product=${encodeURIComponent(productId)}`);
  }

  function closeProduct() {
    const dialog = byId("product-dialog");
    if (dialog.open) dialog.close();
    if (location.hash.startsWith("#product=")) history.replaceState(null, "", `${location.pathname}${location.search}`);
  }

  function openCheckout() {
    if (!cart.length) return;
    byId("cart-dialog").close();
    renderCheckoutSummary();
    byId("checkout-status").textContent = "";
    byId("checkout-dialog").showModal();
  }

  function configurePaymentMethod() {
    const numberNode = byId("payment-method-number");
    if (!numberNode) return;
    const mobileMoneyNumber = config.mtnMobileMoneyNumber || config.phone || "";
    numberNode.textContent = mobileMoneyNumber
      ? `Number: ${escapeHtml(mobileMoneyNumber)}`
      : "Number: Please send the exact number to finish this setup.";
  }

  function configureContact() {
    const details = byId("contact-details");
    const contactItems = [];
    if (config.contactEmail) contactItems.push(`<a href="mailto:${encodeURIComponent(config.contactEmail)}">${escapeHtml(config.contactEmail)}</a>`);
    if (config.phone) contactItems.push(`<a href="tel:${escapeHtml(String(config.phone).replace(/[^+\d]/g, ""))}">${escapeHtml(config.phone)}</a>`);
    if (config.location) contactItems.push(`<span>${escapeHtml(config.location)}</span>`);
    ["instagram", "tiktok"].forEach((network) => {
      const value = config[network];
      if (/^https:\/\//i.test(value || "")) contactItems.push(`<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${network.toUpperCase()} ↗</a>`);
    });
    details.innerHTML = contactItems.length ? contactItems.join("") : '<span>Verified contact details will be added here.</span>';
  }

  function bindEvents() {
    const menu = document.querySelector(".menu-toggle");
    const mobileNav = byId("mobile-nav");
    menu.addEventListener("click", () => {
      const expanded = menu.getAttribute("aria-expanded") === "true";
      menu.setAttribute("aria-expanded", String(!expanded));
      menu.setAttribute("aria-label", expanded ? "Open menu" : "Close menu");
      mobileNav.hidden = expanded;
    });
    mobileNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        mobileNav.hidden = true;
        menu.setAttribute("aria-expanded", "false");
        menu.setAttribute("aria-label", "Open menu");
      }
    });
    document.querySelectorAll("[data-open-cart]").forEach((button) => button.addEventListener("click", () => byId("cart-dialog").showModal()));
    document.querySelectorAll("[data-close-cart]").forEach((button) => button.addEventListener("click", () => byId("cart-dialog").close()));
    document.querySelectorAll("[data-close-product]").forEach((button) => button.addEventListener("click", closeProduct));
    document.querySelectorAll("[data-open-checkout]").forEach((button) => button.addEventListener("click", openCheckout));
    document.querySelectorAll("[data-close-checkout]").forEach((button) => button.addEventListener("click", () => byId("checkout-dialog").close()));

    document.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-view]");
      if (viewButton) openProduct(viewButton.dataset.view);
      const addButton = event.target.closest("[data-add]");
      if (addButton) {
        const product = catalog.find((item) => item.id === addButton.dataset.add);
        const sizeSelect = addButton.closest(".product-card")?.querySelector("[data-size-select]");
        const size = sizeSelect ? (sizeSelect.value || product?.sizes.find((value) => typeof value === "string" && value.trim()) || "") : (product?.sizes.find((value) => typeof value === "string" && value.trim()) || "");
        if (product) addToCart(product.id, size);
      }
      const quantityButton = event.target.closest("[data-quantity]");
      if (quantityButton) {
        const entry = cart.find((item) => item.id === quantityButton.dataset.id && item.size === quantityButton.dataset.size);
        if (entry) {
          entry.quantity = Math.max(0, Math.min(99, entry.quantity + Number(quantityButton.dataset.quantity)));
          if (!entry.quantity) cart = cart.filter((item) => item !== entry);
          saveCart();
        }
      }
      const removeButton = event.target.closest("[data-remove]");
      if (removeButton) {
        cart = cart.filter((item) => !(item.id === removeButton.dataset.remove && item.size === removeButton.dataset.size));
        saveCart();
      }
      const detailAdd = event.target.closest("[data-detail-add]");
      if (detailAdd) {
        const size = byId("product-size")?.value || "";
        const quantity = Math.max(1, Math.min(99, Number(byId("product-quantity").value) || 1));
        addToCart(detailAdd.dataset.detailAdd, size, quantity);
      }
      const buyButton = event.target.closest("[data-buy-now]");
      if (buyButton) {
        const size = byId("product-size")?.value || "";
        const quantity = Math.max(1, Math.min(99, Number(byId("product-quantity").value) || 1));
        addToCart(buyButton.dataset.buyNow, size, quantity);
        closeProduct();
        byId("cart-dialog").close();
        openCheckout();
      }
    });

    byId("product-search").addEventListener("input", renderShop);
    byId("category-filter").addEventListener("change", renderShop);
    byId("sort-products").addEventListener("change", renderShop);
    byId("cart-dialog").addEventListener("click", (event) => {
      if (event.target === byId("cart-dialog")) byId("cart-dialog").close();
    });
    byId("product-dialog").addEventListener("click", (event) => {
      if (event.target === byId("product-dialog")) closeProduct();
    });
    byId("product-dialog").addEventListener("close", () => {
      if (location.hash.startsWith("#product=")) history.replaceState(null, "", `${location.pathname}${location.search}`);
    });
    window.addEventListener("popstate", () => {
      const match = location.hash.match(/^#product=(.+)$/);
      if (match) openProduct(decodeURIComponent(match[1]), false);
      else if (byId("product-dialog").open) byId("product-dialog").close();
    });

    byId("contact-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const status = byId("contact-status");
      if (!config.contactEmail) {
        status.textContent = "Contact email is not configured yet. Add a verified address to STORE_CONFIG in products.js.";
        return;
      }
      const form = new FormData(event.currentTarget);
      const subject = encodeURIComponent(`BLACCSHIRTZ website message from ${form.get("name")}`);
      const body = encodeURIComponent(`${form.get("message")}\n\nFrom: ${form.get("name")}`);
      status.textContent = "Opening your email app with the message ready to send.";
      window.location.href = `mailto:${config.contactEmail}?subject=${subject}&body=${body}`;
    });

    byId("checkout-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const reference = `BS-${Date.now().toString(36).toUpperCase()}`;
      byId("checkout-status").textContent = `Order preview ${reference} confirmed in this browser only. No order was submitted and no payment was taken.`;
    });
  }

  function init() {
    byId("year").textContent = String(new Date().getFullYear());
    renderCategories();
    renderShop();
    renderCart();
    configurePaymentMethod();
    configureContact();
    bindEvents();
    const match = location.hash.match(/^#product=(.+)$/);
    if (match) openProduct(decodeURIComponent(match[1]), false);
  }

  init();
})();
