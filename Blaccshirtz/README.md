# BLACCSHIRTZ

A static, responsive streetwear storefront built with HTML, CSS, and vanilla JavaScript. It can be hosted directly on GitHub Pages and does not need a build step or server to display.

## Product catalog

Edit `products.js` to update the nine products imported from the supplied storefront. Their original photos are stored locally under `images/products/`, and all nine source prices are GH₵150. Product IDs must match the slots listed on the Shop grid in `index.html`.

The source storefront did not provide sizes, and two items had no description, so those fields are intentionally left empty rather than guessed. Add verified details when available. Each product uses:

- `id`, `name`, `price`, `description`, `image`, `category`, `sizes`

Set the currency and verified business contact/social details in `STORE_CONFIG`.

## Preview

Open `index.html` in a browser, or serve this folder with any local static-file server. No dependencies or build command are required.

## GitHub Pages

Push this folder to a GitHub repository, then in **Settings → Pages**, select **Deploy from a branch**, choose the branch and `/ (root)` folder, and save. The entry point is `index.html`.

## Store integration

Product browsing, filtering, product details, cart updates, and cart persistence run in the browser. GitHub Pages is static hosting: the checkout currently validates the form and presents an order summary, but it does not transmit orders or process payments. Connect a payment provider and an order endpoint before accepting real orders. The contact form opens an email draft once `contactEmail` is configured.
