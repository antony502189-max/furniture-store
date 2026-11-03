# Furniture Store

A responsive static implementation of the Furniture Store template by Figma Guru.

## Live site

https://antony502189-max.github.io/furniture-store/

## Pages

- `index.html` — home, categories, new products and bestsellers
- `shop.html` — catalog, search, filters, sorting and product previews
- `about.html` — brand story, team and gallery
- `contact.html` — contact details, map link and validated email draft form

Open the website through a local HTTP server to preview it. No build step or runtime framework is required. HTML, CSS, JavaScript, product data, fonts and images are all included. Relative URLs support GitHub Pages project hosting.

Favorites, color variants, shopping bag quantities, a local profile/address and downloadable order drafts are saved in this browser on this device. The bag calculates totals and can prepare an order draft; it does not place an order or take payment. Drafts can be downloaded and deleted from Orders. No server account is created.

Contact and newsletter forms validate input and prepare an encoded email draft, with a downloadable text alternative. The visitor chooses **Open email app**, reviews the recipient, and sends it themselves. They do not claim that a message was delivered or a subscription activated. The email address, telephone numbers and address are the original template contacts; replace them with the real store contacts before using enquiries commercially. Payment, automatic email delivery, newsletter processing and remote accounts need external services.

`products.json` is the source for prices and sample filter metadata. The 12 catalog items have working search, categories, room links, colors, material/brand filters, sorting and two pages of six items. A Modern Chair is also shown on the home page. Empty categories show a recoverable no-results state. The actual image assets are unchanged: choosing a color records that variant rather than recoloring the supplied image.

The former video placeholder opens a browsable image showroom, because no video was supplied. Social controls share the site or open furniture inspiration; they do not invent store social profiles. All collection calls to action, sidebar bestsellers, service links, telephone/email links and the map link have destinations.

## Browser verification

The repeatable Playwright CLI checks are in `tests/`. They cover every catalog product, colors, favorites, cart totals/quantities/removal, saved drafts/downloads, profile/address persistence, filters/search/sorting/pagination, forms, showroom controls, service actions, mobile menu, keyboard actions, failed product loading and malformed storage. They check all four pages for horizontal overflow at 375, 390, 768, 1024 and 1440 pixels.

Use a dedicated test browser session: **the checks clear this site's local storage in that session and download test drafts**. Start a local server with `python -m http.server 8123`, then run from the repository root:

```powershell
npx --yes --package @playwright/cli playwright-cli -s=furniture-check open http://127.0.0.1:8123/
npx --yes --package @playwright/cli playwright-cli -s=furniture-check run-code --filename=tests/browser-check.js
npx --yes --package @playwright/cli playwright-cli -s=furniture-check run-code --filename=tests/extra-check.js
```

The checks use the opened page's directory as their base, so the same commands can verify the deployed GitHub Pages URL. Email and payment delivery are intentionally outside the static site's capabilities; no real messages or orders are sent during verification.

The source Figma file contains blurred room photographs and gray product silhouettes; those exact supplied assets are retained. Original photography and video were not included in the template. Mobile layouts are adapted from the desktop designs.

## Attribution

Design: [Furniture Store Figma Template](https://www.figma.com/community/file/1432845144121539430/furniture-store-figma-template) by [Figma Guru](https://figma.guru/), shared under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Adapted into responsive HTML/CSS with browser interactions. The attribution in the design footer is preserved.

DM Sans, Ubuntu, Afacad, Damion and Inter are bundled locally from Google Fonts. Their license notices are included under `assets/fonts/licenses/`.

## Deployment

GitHub Pages serves the root of the `main` branch. Commit and push changes to update the site. `.nojekyll` keeps this a plain static site.
