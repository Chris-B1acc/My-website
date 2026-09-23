const products = [
  { id: 1, name: "Greek Gods (Zeus)", price: 150, image: "images/products/fotv2248.jpg", description: "A heavyweight statement piece for your everyday mythology." },
  { id: 2, name: "Greek Gods(Hades)", price: 150, image: "images/products/owcc2897.jpg", description: "Lightweight comfort with a clean, easy silhouette." },
  { id: 3, name: "Greek Gods(Hera)", price: 150, image: "images/products/xxnw9578.jpg", description: "A sharper stripe for the weekend rotation." },
  { id: 4, name: "Greek Gods(Athena)", price: 150, image: "images/products/fhxq8691.jpg", description: "Soft texture, strong silhouette, zero apologies." },
  { id: 5, name: "Greek Gods(Aphrodite)", price: 150, image: "images/products/nifb5679.jpg" },
  { id: 6, name: "Greek Gods(Ares)", price: 150, image: "images/products/cfua4570.jpg" },
  { id: 7, name: "Greek Gods(Poseidon)", price: 150, image: "images/products/jhjr1973.jpg", description: "A bold ocean-inspired statement for everyday wear." },
  { id: 8, name: "Greek Gods(Artemis)", price: 150, image: "images/products/cesp8836.jpg", description: "A sharp, independent silhouette with mythic energy." },
  { id: 9, name: "Greek Gods(Apollo)", price: 150, image: "images/products/rchj4099.jpg", description: "A clean graphic piece made to stand in the spotlight." }
  
];
const cart = [];
const productGrid = document.getElementById("product-grid");
const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const subtotalEl = document.getElementById("subtotal");
const cartPanel = document.getElementById("cart-panel");
const cartBackdrop = document.getElementById("cart-backdrop");
const toast = document.getElementById("toast");
function formatPrice(value) { return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", currencyDisplay: "code" }).format(value).replace("GHS", "GH₵"); }
function getCartItem(productId) { return cart.find((item) => item.id === productId); }
function showToast(message) { toast.textContent = message; toast.classList.add("show"); window.clearTimeout(showToast.timeout); showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2200); }
function renderProducts(list = products) { productGrid.innerHTML = list.map((product) => `<article class="product-card"><div class="product-image"><span class="product-badge">${product.badge || "New"}</span><img src="${product.image}" alt="${product.name}" loading="lazy" /></div><div class="product-info"><div class="product-meta"><h3>${product.name}</h3><span class="price">${formatPrice(product.price)}</span></div><p>${product.description || "A statement piece for your everyday rotation."}</p><div class="product-actions"><span class="tag">${product.category || "Greek Gods"}</span><button class="add-btn" type="button" data-id="${product.id}">Add to bag</button></div></div></article>`).join(""); document.getElementById("no-results").classList.toggle("visible", list.length === 0); }
function updateCart() { cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0); subtotalEl.textContent = formatPrice(cart.reduce((total, item) => total + item.price * item.quantity, 0)); cartItems.innerHTML = cart.length ? cart.map((item) => `<div class="cart-item"><img src="${item.image}" alt="${item.name}" /><div class="item-details"><h4>${item.name}</h4><span class="item-price">${formatPrice(item.price)}</span><div class="item-qty"><button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}">−</button><span>${item.quantity}</span><button class="qty-btn" type="button" data-action="increase" data-id="${item.id}">+</button></div></div><button class="remove-btn" type="button" data-action="remove" data-id="${item.id}">Remove</button></div>`).join("") : '<p class="empty-cart">Your bag is waiting.</p>'; }
function setCartOpen(isOpen) { cartPanel.classList.toggle("open", isOpen); cartBackdrop.classList.toggle("open", isOpen); cartPanel.setAttribute("aria-hidden", String(!isOpen)); document.body.classList.toggle("cart-open", isOpen); }
function addToCart(productId) { const product = products.find((item) => item.id === productId); if (!product) return; const existing = getCartItem(productId); existing ? existing.quantity += 1 : cart.push({ ...product, quantity: 1 }); updateCart(); setCartOpen(true); showToast(`${product.name} added to your bag`); }
function changeQuantity(productId, change) { const item = getCartItem(productId); if (!item) return; item.quantity += change; if (item.quantity <= 0) cart.splice(cart.indexOf(item), 1); updateCart(); }
document.addEventListener("click", (event) => { const addButton = event.target.closest(".add-btn"); if (addButton) return addToCart(Number(addButton.dataset.id)); const qtyButton = event.target.closest(".qty-btn"); if (qtyButton) return qtyButton.dataset.action === "increase" ? changeQuantity(Number(qtyButton.dataset.id), 1) : changeQuantity(Number(qtyButton.dataset.id), -1); const removeButton = event.target.closest(".remove-btn"); if (removeButton) { cart.splice(cart.findIndex((item) => item.id === Number(removeButton.dataset.id)), 1); return updateCart(); } if (event.target.closest(".cart-btn")) setCartOpen(true); if (event.target.closest("#close-cart") || event.target === cartBackdrop) setCartOpen(false); if (event.target.closest(".checkout-btn")) { if (!cart.length) return showToast("Add an item before checkout"); showToast("Opening MTN MoMo transfer..."); window.location.href = "tel:*170%23"; } });
document.getElementById("search-button").addEventListener("click", () => { document.getElementById("search-bar").classList.toggle("open"); document.getElementById("search-input").focus(); });
document.getElementById("search-bar").addEventListener("submit", (event) => event.preventDefault());
document.getElementById("search-input").addEventListener("input", (event) => { const query = event.target.value.toLowerCase().trim(); renderProducts(products.filter((product) => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query))); });
renderProducts(); updateCart();
