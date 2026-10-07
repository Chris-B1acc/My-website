const rawProducts = window.BLACCSHIRTZ_PRODUCTS;
const currency = window.BLACCSHIRTZ_CURRENCY || "GHS";
const storageKey = "blaccshirtz-bag-v1";

function validateProducts(value) {
  if (!Array.isArray(value)) {
    console.error("BLACCSHIRTZ_PRODUCTS must be an array in product-data.js.");
    return [];
  }

  const seenIds = new Set();
  return value.filter((product, index) => {
    const valid = product
      && typeof product.id === "string"
      && product.id.trim() !== ""
      && typeof product.name === "string"
      && product.name.trim() !== ""
      && typeof product.description === "string"
      && typeof product.category === "string"
      && product.category.trim() !== ""
      && typeof product.image === "string"
      && product.image.trim() !== ""
      && Number.isFinite(product.price)
      && product.price >= 0
      && !seenIds.has(product.id);

    if (!valid) {
      console.error(`Skipping invalid product at index ${index} in product-data.js.`);
      return false;
    }
    seenIds.add(product.id);
    return true;
  });
}

const products = validateProducts(rawProducts);
const money = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency,
  minimumFractionDigits: 2
});
const featuredGrid = document.getElementById("featured-grid");
const catalogGrid = document.getElementById("catalog-grid");
const searchInput = document.getElementById("product-search");
const categoryFilter = document.getElementById("category-filter");
const catalogCount = document.getElementById("catalog-count");
const bagCount = document.getElementById("bag-count");
const drawer = document.getElementById("cart-drawer");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerBody = document.getElementById("drawer-body");
const productDialog = document.getElementById("product-dialog");
const productDialogContent = document.getElementById("product-dialog-content");
const toast = document.getElementById("toast");
const menuToggle = document.getElementById("menu-toggle");
const siteNav = document.getElementById("site-nav");

let cart = loadCart();
let drawerReturnFocus = null;
let drawerIsOpen = false;
let drawerFrame = 0;
let drawerCloseTimer = 0;
let toastTimer = 0;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPrice(price) {
  return money.format(price);
}

function loadCart() {
  let saved;
  try {
    saved = window.localStorage.getItem(storageKey);
  } catch (error) {
    console.warn("The saved bag is unavailable in this browser.", error);
    return [];
  }
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError("Saved bag is not a list.");
    return parsed.reduce((items, entry) => {
      if (!entry || typeof entry.id !== "string" || !Number.isInteger(entry.quantity)) return items;
      const product = products.find((item) => item.id === entry.id);
      if (product && entry.quantity > 0 && entry.quantity <= 99) {
        items.push({ id: product.id, quantity: entry.quantity });
      }
      return items;
    }, []);
  } catch (error) {
    console.warn("The saved bag could not be read and has been ignored.", error);
    return [];
  }
}

function saveCart() {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch (error) {
    console.warn("The bag could not be saved in this browser.", error);
    showToast("Your bag works for this visit but could not be saved.");
  }
}

function announce(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function emptyCatalogMarkup() {
  return `
    <div class="empty-state">
      <span class="empty-state-mark" aria-hidden="true">B</span>
      <h3>The collection is taking shape.</h3>
      <p>There are no products to show yet. Add verified product details to <strong>product-data.js</strong>—including a name, price, category, and path to a real product image. Add a description only when you have accurate copy.</p>
    </div>`;
}

function noMatchesMarkup() {
  return `
    <div class="empty-state filtered-empty">
      <span class="empty-state-mark" aria-hidden="true">⌕</span>
      <h3>No matching pieces.</h3>
      <p>Try another search or choose a different category.</p>
    </div>`;
}

function productCardMarkup(product) {
  const id = escapeHTML(product.id);
  const name = escapeHTML(product.name);
  const description = escapeHTML(product.description);
  const category = escapeHTML(product.category);
  const image = escapeHTML(product.image);
  return `
    <article class="product-card">
      <button class="product-card-image" type="button" data-product-id="${id}" aria-label="View ${name} details">
        <img src="${image}" alt="${name}" loading="lazy">
      </button>
      <div class="product-card-meta">
        <h3>${name}</h3>
        <span class="product-card-price">${formatPrice(product.price)}</span>
      </div>
      <p class="product-card-category">${category}</p>
      <div class="product-card-actions">
        <button class="product-open" type="button" data-product-id="${id}">View details</button>
        <button class="add-button" type="button" data-add-id="${id}">Add to bag <span aria-hidden="true">+</span></button>
      </div>
      <span class="sr-only">${description}</span>
    </article>`;
}

function getVisibleProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const category = categoryFilter.value;
  return products.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const searchable = `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase();
    return matchesCategory && (!query || searchable.includes(query));
  });
}

function renderProducts() {
  const selectedFeatured = products.filter((product) => product.featured === true || product.newArrival === true);
  const featured = (selectedFeatured.length ? selectedFeatured : products).slice(0, 4);
  featuredGrid.innerHTML = featured.length
    ? featured.map(productCardMarkup).join("")
    : emptyCatalogMarkup();

  const visibleProducts = getVisibleProducts();
  catalogCount.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? "piece" : "pieces"}`;
  catalogGrid.innerHTML = visibleProducts.length
    ? visibleProducts.map(productCardMarkup).join("")
    : products.length ? noMatchesMarkup() : emptyCatalogMarkup();
}

function populateCategories() {
  const categories = [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b));
  categoryFilter.innerHTML = '<option value="">All categories</option>' + categories
    .map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`)
    .join("");
}

function cartEntries() {
  return cart.map((entry) => ({
    ...entry,
    product: products.find((product) => product.id === entry.id)
  })).filter((entry) => entry.product);
}

function cartItemCount() {
  return cart.reduce((sum, entry) => sum + entry.quantity, 0);
}

function cartTotal() {
  return cartEntries().reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
}

function updateBagCount() {
  const count = cartItemCount();
  bagCount.textContent = String(count);
  bagCount.setAttribute("aria-label", `${count} ${count === 1 ? "item" : "items"}`);
}

function cartLineMarkup(entry) {
  const product = entry.product;
  const id = escapeHTML(product.id);
  return `
    <article class="cart-line">
      <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
      <div class="cart-line-info">
        <h3>${escapeHTML(product.name)}</h3>
        <p>${formatPrice(product.price)}</p>
        <div class="quantity-control" aria-label="Quantity">
          <button type="button" data-quantity-id="${id}" data-change="-1" aria-label="Remove one ${escapeHTML(product.name)}">−</button>
          <span>${entry.quantity}</span>
          <button type="button" data-quantity-id="${id}" data-change="1" aria-label="Add one ${escapeHTML(product.name)}">+</button>
        </div>
      </div>
      <button class="remove-item" type="button" data-remove-id="${id}" aria-label="Remove ${escapeHTML(product.name)} from bag">Remove</button>
    </article>`;
}

function renderCart() {
  updateBagCount();
  const entries = cartEntries();
  if (!entries.length) {
    drawerBody.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-mark" aria-hidden="true">B</span>
        <h3>Your bag is taking a breather.</h3>
        <p>When you find a piece that feels like you, it will be waiting here.</p>
        <a class="button button-primary" href="#shop">Explore the collection <span aria-hidden="true">↗</span></a>
      </div>`;
    return;
  }

  drawerBody.innerHTML = `
    <div class="cart-lines">${entries.map(cartLineMarkup).join("")}</div>
    <div class="cart-summary">
      <p class="cart-subtotal"><span>Subtotal</span><span>${formatPrice(cartTotal())}</span></p>
      <p class="cart-total"><span>Total</span><strong>${formatPrice(cartTotal())}</strong></p>
      <p class="cart-disclaimer">This static storefront does not process payments or submit orders. Checkout below prepares a local confirmation only.</p>
      <button class="button button-primary drawer-action" id="start-checkout" type="button">Continue to checkout <span aria-hidden="true">↗</span></button>
    </div>`;
}

function openDrawer(opener) {
  window.clearTimeout(drawerCloseTimer);
  drawerIsOpen = true;
  drawerReturnFocus = opener instanceof HTMLElement ? opener : document.activeElement;
  renderCart();
  drawer.hidden = false;
  drawer.inert = false;
  drawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
  window.cancelAnimationFrame(drawerFrame);
  drawerFrame = requestAnimationFrame(() => {
    if (!drawerIsOpen) return;
    drawer.classList.add("is-open");
    drawerBackdrop.classList.add("is-open");
    document.getElementById("close-drawer").focus();
  });
}

function closeDrawer() {
  if (!drawerIsOpen) return;
  drawerIsOpen = false;
  window.cancelAnimationFrame(drawerFrame);
  drawer.classList.remove("is-open");
  drawerBackdrop.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  drawer.inert = true;
  document.body.classList.remove("drawer-open");
  drawerCloseTimer = window.setTimeout(() => {
    if (drawerIsOpen) return;
    drawer.hidden = true;
    drawerBackdrop.hidden = true;
  }, 300);
  if (drawerReturnFocus instanceof HTMLElement) drawerReturnFocus.focus();
}

function addToCart(id) {
  const product = products.find((item) => item.id === id);
  if (!product) {
    console.error(`Cannot add unknown product "${id}" to the bag.`);
    return;
  }
  const existing = cart.find((entry) => entry.id === id);
  if (existing) {
    if (existing.quantity >= 99) {
      announce("The maximum quantity for this item is 99.");
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }
  saveCart();
  renderCart();
  announce("Added to your bag.");
  if (!drawer.classList.contains("is-open")) openDrawer(document.activeElement);
}

function changeQuantity(id, amount) {
  const entry = cart.find((item) => item.id === id);
  if (!entry) return;
  if (amount > 0 && entry.quantity >= 99) {
    announce("The maximum quantity for this item is 99.");
    return;
  }
  entry.quantity += amount;
  if (entry.quantity <= 0) cart = cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
}

function openProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) {
    console.error(`Cannot show unknown product "${id}".`);
    return;
  }
  productDialogContent.innerHTML = `
    <div class="product-detail">
      <img class="product-detail-image" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
      <div class="product-detail-copy">
        <p class="eyebrow"><span class="eyebrow-line"></span> ${escapeHTML(product.category)}</p>
        <h2 id="product-dialog-title">${escapeHTML(product.name)}</h2>
        <p class="product-detail-price">${formatPrice(product.price)}</p>
        ${product.description ? `<p class="product-detail-description">${escapeHTML(product.description)}</p>` : ""}
        <button class="button button-primary" type="button" data-dialog-add-id="${escapeHTML(product.id)}">Add to bag <span aria-hidden="true">+</span></button>
      </div>
    </div>`;
  productDialog.showModal();
}

function renderCheckout() {
  const entries = cartEntries();
  drawerBody.innerHTML = `
    <form class="checkout-form" id="checkout-form">
      <h3>Your details</h3>
      <p>Complete this form to preview your order confirmation. This static site does not send your details or process payment.</p>
      <div class="checkout-recap" aria-label="Order items">
        ${entries.map(({ product, quantity }) => `
          <p class="checkout-recap-row">
            <span>${escapeHTML(product.name)} <small>× ${quantity}</small></span>
            <strong>${formatPrice(product.price * quantity)}</strong>
          </p>`).join("")}
      </div>
      <label for="checkout-name">Full name</label>
      <input id="checkout-name" name="name" autocomplete="name" required maxlength="100">
      <label for="checkout-email">Email address</label>
      <input id="checkout-email" name="email" type="email" autocomplete="email" required maxlength="254">
      <label for="checkout-address">Delivery address</label>
      <input id="checkout-address" name="address" autocomplete="street-address" required maxlength="200">
      <p class="cart-total"><span>Order total</span><strong>${formatPrice(cartTotal())}</strong></p>
      <div class="checkout-buttons">
        <button class="button button-quiet" id="back-to-bag" type="button">Back to bag</button>
        <button class="button button-primary" type="submit">Preview order <span aria-hidden="true">↗</span></button>
      </div>
      <p class="checkout-error" id="checkout-error" role="status"></p>
    </form>`;
}

function renderConfirmation(name, orderTotal, orderItems) {
  const reference = `BS-${Date.now().toString(36).toUpperCase()}`;
  drawerBody.innerHTML = `
    <div class="order-confirmation">
      <span class="confirmation-mark" aria-hidden="true">✓</span>
      <h3>Order preview ready, ${escapeHTML(name)}.</h3>
      <p class="order-reference">LOCAL REFERENCE / ${reference}</p>
      <div class="checkout-recap" aria-label="Order items">
        ${orderItems.map(({ product, quantity }) => `
          <p class="checkout-recap-row">
            <span>${escapeHTML(product.name)} <small>× ${quantity}</small></span>
            <strong>${formatPrice(product.price * quantity)}</strong>
          </p>`).join("")}
        <p class="checkout-recap-row recap-total"><span>Total</span><strong>${formatPrice(orderTotal)}</strong></p>
      </div>
      <p>Your ${formatPrice(orderTotal)} order preview is shown for this browser only. <strong>No order has been sent and no payment was processed.</strong> Connect a secure checkout service before accepting real orders.</p>
      <button class="button button-primary drawer-action" id="finish-confirmation" type="button">Continue browsing <span aria-hidden="true">↗</span></button>
    </div>`;
}

function closeMobileMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  siteNav.classList.remove("is-open");
}

document.getElementById("copyright-year").textContent = String(new Date().getFullYear());
populateCategories();
renderProducts();
renderCart();

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
  siteNav.classList.toggle("is-open", !isExpanded);
  if (!isExpanded) siteNav.querySelector("a").focus();
});
siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMobileMenu();
});

document.getElementById("bag-trigger").addEventListener("click", (event) => openDrawer(event.currentTarget));
document.getElementById("close-drawer").addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const addButton = target.closest("[data-add-id], [data-dialog-add-id]");
  if (addButton) {
    const id = addButton.dataset.addId || addButton.dataset.dialogAddId;
    if (productDialog.open) productDialog.close();
    addToCart(id);
    return;
  }

  const productButton = target.closest("[data-product-id]");
  if (productButton) {
    openProduct(productButton.dataset.productId);
    return;
  }

  const quantityButton = target.closest("[data-quantity-id]");
  if (quantityButton) {
    changeQuantity(quantityButton.dataset.quantityId, Number(quantityButton.dataset.change));
    return;
  }

  const removeButton = target.closest("[data-remove-id]");
  if (removeButton) {
    cart = cart.filter((entry) => entry.id !== removeButton.dataset.removeId);
    saveCart();
    renderCart();
    return;
  }

  if (target.closest("#start-checkout")) {
    renderCheckout();
    document.getElementById("checkout-name").focus();
    return;
  }

  if (target.closest("#back-to-bag")) {
    renderCart();
    document.getElementById("start-checkout").focus();
    return;
  }

  if (target.closest("#finish-confirmation")) closeDrawer();
});

drawerBody.addEventListener("submit", (event) => {
  if (!(event.target instanceof HTMLFormElement) || event.target.id !== "checkout-form") return;
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  const formData = new FormData(event.target);
  const name = String(formData.get("name") || "").trim();
  if (!name || !cart.length) {
    document.getElementById("checkout-error").textContent = "Your bag is empty. Add a product before continuing.";
    return;
  }
  const total = cartTotal();
  const orderItems = cartEntries();
  cart = [];
  saveCart();
  updateBagCount();
  renderConfirmation(name, total, orderItems);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const menuWasOpen = menuToggle.getAttribute("aria-expanded") === "true";
    closeMobileMenu();
    if (menuWasOpen) menuToggle.focus();
    if (!drawer.hidden) closeDrawer();
  }
  if (event.key !== "Tab" || drawer.hidden) return;
  const focusable = [...drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
    .filter((element) => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

document.getElementById("close-product-dialog").addEventListener("click", () => productDialog.close());
productDialog.addEventListener("click", (event) => {
  if (event.target === productDialog) productDialog.close();
});

document.getElementById("contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  document.getElementById("contact-status").textContent =
    "Your details are valid, but this static site cannot deliver messages. Connect a form service before launch.";
  event.currentTarget.reset();
});
