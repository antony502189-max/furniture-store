/* Browser-only profiles and order drafts; no payment or delivery is implied. */
"use strict";
let profile = readSaved("furniture-profile", {}),
  orders = readSaved("furniture-orders", []);
if (!profile || typeof profile !== "object" || Array.isArray(profile))
  profile = {};
if (!Array.isArray(orders)) orders = [];
orders = orders.filter(
  (o) =>
    o &&
    typeof o.id === "string" &&
    o.customer &&
    Array.isArray(o.items) &&
    o.items.every(
      (p) => validItem(p) && Number.isInteger(p.quantity) && p.quantity > 0,
    ),
);
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    toast("Storage unavailable. Download your draft to keep a copy.");
    return false;
  }
}
function downloadText(text, filename) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function profileField(label, name, type = "text", required = true) {
  return `<label>${label}<input name="${name}" type="${type}" value="${safe(profile[name] || "")}" ${required ? "required" : ""} maxlength="300" autocomplete="${{ name: "name", email: "email", phone: "tel", address: "street-address" }[name]}"></label>`;
}
function showAccount(address = false) {
  showPanel(
    address ? "Delivery address" : "Your profile",
    `<p class="dialog-note">Saved in this browser on this device. No online account is created.</p><form class="dialog-form" data-local-form="profile">${profileField("Name", "name")}${profileField("Email", "email", "email")}${profileField("Phone", "phone", "tel", false)}${profileField("Delivery address", "address", "text", false)}<button class="primary-button">Save details</button><p class="form-feedback" role="status" hidden></p></form><div class="dialog-actions"><button class="text-button" data-extra="orders">Order drafts</button><button class="text-button" data-extra="clear-profile">Clear saved details</button></div>`,
  );
}
function prepareOrder() {
  if (!cart.length) return collection("cart");
  showPanel(
    "Prepare your order",
    `<p>Total: <strong>${money(cart.reduce((s, p) => s + p.price * p.quantity, 0))}</strong></p><p class="dialog-note">Save a downloadable draft to review or send to the store yourself. This does not place an order or charge you.</p><form class="dialog-form" data-local-form="checkout">${profileField("Name", "name")}${profileField("Email", "email", "email")}${profileField("Phone", "phone", "tel", false)}${profileField("Delivery address", "address")}<button class="primary-button">Save order draft</button></form>`,
  );
}
function orderText(o) {
  return `Order draft ${o.id}\n${o.date}\n\n${o.items.map((p) => `${p.title} (${p.color || "Grey"}) × ${p.quantity}: ${money(p.price * p.quantity)}`).join("\n")}\n\nTotal: ${money(o.items.reduce((s, p) => s + p.price * p.quantity, 0))}\n\n${o.customer.name}\n${o.customer.email}\n${o.customer.phone || ""}\n${o.customer.address}\n\nDraft only — not submitted or paid.`;
}
function showOrders() {
  showPanel(
    "Order drafts",
    `<p class="dialog-note">Drafts saved on this device. They have not been sent to the store.</p>${orders.length ? orders.map((o) => `<div class="order-row"><strong>${safe(o.id)}</strong><p>${safe(o.date)} · ${money(o.items.reduce((s, p) => s + p.price * p.quantity, 0))}</p><div class="dialog-actions"><button class="text-button" data-download-order="${safe(o.id)}">Download draft</button><button class="text-button" data-delete-order="${safe(o.id)}">Delete draft</button></div></div>`).join("") : '<p>No order drafts yet.</p><button class="primary-button" data-action="cart">Open shopping bag</button>'}`,
  );
}
function service(label) {
  if (label === "Orders") return showOrders();
  if (label === "Addresses") return showAccount(true);
  if (label === "Account details") return showAccount();
  const info = {
    "F.A.Q":
      "<details open><summary>How do I choose furniture?</summary><p>Use categories, search, price, material and color filters in the shop. Open a product to select a color and add it to your bag.</p></details><details><summary>Where are my selections saved?</summary><p>Favorites, the bag, profile and order drafts stay in this browser on this device.</p></details><details><summary>Can I pay online?</summary><p>Payments are not connected. You can prepare and download an order draft from your bag.</p></details><details><summary>How do I contact the store?</summary><p>The contact form prepares an email draft. Review the recipient in your mail app and send it yourself.</p></details>",
    Returns:
      "<p>Include the order reference, item and reason in your return enquiry. The store must confirm eligibility and instructions before you send anything back.</p>",
    Return:
      "<p>Use the contact form to prepare a return enquiry. Include your order reference and the item you want to return.</p>",
    "Free Delivery":
      "<p>Delivery availability, cost and timing must be confirmed with the store for your address. Use the contact form to request a delivery quote.</p>",
  };
  showPanel(
    label,
    `${info[label] || ""}<div class="dialog-actions"><a class="primary-button" href="contact.html?subject=${encodeURIComponent(label)}">Contact us</a><a class="text-button" href="shop.html">Browse furniture</a></div>`,
  );
}
const swatchColors = {
  Grey: "#bdbdbd",
  Brown: "#a89891",
  Blue: "#8f909b",
  White: "#f6f4f2",
  Black: "#343434",
  Green: "#8a9b8a",
};
function swatches(p, selected) {
  return (p.colors || ["Grey", "Brown", "Blue"])
    .map(
      (color) =>
        `<button type="button" class="color-swatch" style="--swatch:${swatchColors[color]}" data-color="${color}" aria-label="${color} for ${safe(p.title)}" aria-pressed="${color === selected}"></button>`,
    )
    .join("");
}
function viewProduct(p) {
  if (!p) return;
  const selected = { ...p, color: p.color || p.colors?.[0] || "Grey" };
  panel.dataset.activeProduct = JSON.stringify(selected);
  showPanel(
    p.title,
    `<div class="dialog-product"><img src="${safe(p.image)}" alt="${safe(p.title)}"><div><h3>${money(p.price)}</h3><p>${safe(p.category || "Furniture")} for a comfortable home.</p><div class="color-options" role="group" aria-label="Choose color">${swatches(p, selected.color)}</div><p data-selected-color>Color: ${safe(selected.color)}</p><button class="primary-button" data-add="${safe(p.id)}">Add to bag</button></div></div>`,
  );
}
function collection(type) {
  const list = type === "cart" ? cart : favorites;
  showPanel(
    type === "cart" ? "Shopping bag" : "Favorites",
    list.length
      ? list
          .map((p) => {
            const key = p.id + ":" + (p.color || "Grey");
            return `<div class="collection-row"><img src="${safe(p.image)}" alt=""><div><button class="text-button" data-view="${safe(p.id)}">${safe(p.title)}</button><span>${money(p.price)} · ${safe(p.color || "Grey")}</span>${type === "cart" ? `<div class="quantity-controls"><button data-quantity="${safe(key)}" data-delta="-1" aria-label="Decrease ${safe(p.title)} quantity">−</button><span>${p.quantity}</span><button data-quantity="${safe(key)}" data-delta="1" aria-label="Increase ${safe(p.title)} quantity">+</button></div>` : `<button class="text-button" data-add-favorite="${safe(p.id)}">Add to bag</button>`}</div><button data-remove="${safe(type === "cart" ? key : p.id)}" data-kind="${type}" aria-label="Remove ${safe(p.title)}">Remove</button></div>`;
          })
          .join("") +
          (type === "cart"
            ? `<p class="cart-total">Total: <strong>${money(cart.reduce((s, p) => s + p.price * p.quantity, 0))}</strong></p><div class="dialog-actions"><button class="primary-button" data-extra="checkout">Prepare order</button><a class="text-button" href="shop.html">Continue shopping</a></div><p class="dialog-note">Prepare a downloadable draft. Online payments and order delivery are not connected.</p>`
            : "")
      : `<p>No ${type === "cart" ? "items in your bag" : "favorites"} yet.</p><a class="primary-button" href="shop.html">Explore the collection</a>`,
  );
}
let galleryIndex = 0;
const gallery = [
  "assets/home-imgImgButton.png",
  "assets/home-imgImg12.png",
  "assets/shopcatalog-imgImg2.png",
];
function showGallery() {
  showPanel(
    "Furniture showroom",
    `<div class="dialog-gallery"><img src="${gallery[galleryIndex]}" alt="Showroom image ${galleryIndex + 1}"><div class="dialog-actions"><button class="text-button" data-gallery="-1">Previous image</button><span aria-live="polite">${galleryIndex + 1} / ${gallery.length}</span><button class="text-button" data-gallery="1">Next image</button></div><a class="primary-button" href="shop.html">Shop the collection</a></div>`,
  );
}
// Extra controls share the same delegated event model as the catalog.
document.addEventListener("click", (e) => {
  const b = e.target.closest("button,[data-action]");
  if (!b) return;
  const action = b.dataset.action;
  if (b.dataset.color) {
    const card = b.closest("[data-product]");
    $$("[data-color]", b.closest(".color-options")).forEach((x) =>
      x.setAttribute("aria-pressed", String(x === b)),
    );
    if (card) card.dataset.selectedColor = b.dataset.color;
    else {
      const p = JSON.parse(panel.dataset.activeProduct);
      p.color = b.dataset.color;
      panel.dataset.activeProduct = JSON.stringify(p);
      $("[data-selected-color]").textContent = "Color: " + b.dataset.color;
    }
    return;
  }
  if (b.dataset.view) {
    const card = b.closest("[data-product]");
    viewProduct(card ? fromCard(card) : product(b.dataset.view));
    return;
  }
  if (b.dataset.addFavorite) {
    addToCart(favorites.find((p) => p.id === b.dataset.addFavorite));
    return;
  }
  if (b.dataset.extra === "checkout") prepareOrder();
  if (b.dataset.extra === "orders") showOrders();
  if (b.dataset.extra === "clear-profile") {
    profile = {};
    saveLocal("furniture-profile", profile);
    showAccount();
    toast("Saved profile cleared");
  }
  if (b.dataset.gallery) {
    galleryIndex =
      (galleryIndex + Number(b.dataset.gallery) + gallery.length) %
      gallery.length;
    showGallery();
  }
  if (b.dataset.downloadOrder) {
    const o = orders.find((o) => o.id === b.dataset.downloadOrder);
    if (o) downloadText(orderText(o), o.id + ".txt");
  }
  if (b.dataset.deleteOrder) {
    orders = orders.filter((o) => o.id !== b.dataset.deleteOrder);
    saveLocal("furniture-orders", orders);
    showOrders();
  }
});
document.addEventListener("submit", (e) => {
  const form = e.target;
  if (!form.matches("[data-local-form],[data-form]")) return;
  e.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(
    [...new FormData(form)].map(([key, value]) => [key, String(value).trim()]),
  );
  for (const input of $$("[required]", form)) {
    if (!String(input.value).trim()) {
      input.setCustomValidity("Please enter a value.");
      input.reportValidity();
      input.addEventListener("input", () => input.setCustomValidity(""), {
        once: true,
      });
      return;
    }
  }
  if (form.dataset.localForm === "profile") {
    profile = data;
    const stored = saveLocal("furniture-profile", profile);
    const status = $(".form-feedback", form);
    status.hidden = false;
    status.textContent = stored
      ? "Details saved on this device."
      : "Details kept for this visit only.";
    return;
  }
  if (form.dataset.localForm === "checkout") {
    if (!cart.length) return collection("cart");
    const draft = {
      id: "DRAFT-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      date: new Date().toLocaleDateString("en-US"),
      customer: data,
      items: cart.map((p) => ({ ...p })),
    };
    orders.unshift(draft);
    const stored = saveLocal("furniture-orders", orders);
    showOrders();
    toast(
      stored
        ? "Order draft saved. Nothing has been sent or charged."
        : "Draft kept for this visit. Download it to keep a copy.",
    );
    return;
  }
  let feedback = $(".form-feedback", form);
  if (!feedback) {
    feedback = document.createElement("div");
    feedback.className = "form-feedback";
    feedback.setAttribute("role", "status");
    form.append(feedback);
  }
  const contact = form.dataset.form === "contact",
    subject = contact
      ? "Furniture Store enquiry"
      : "Newsletter subscription request";
  const body = contact
    ? `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || ""}\n\n${data.message}`
    : `Please subscribe ${data.email} to your newsletter.`;
  const mailto = `mailto:fStore@email.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  feedback.innerHTML = `<p>Your email draft is ready. The site has not sent ${contact ? "your message" : "a subscription request"}.</p><div class="dialog-actions"><a class="text-button" href="${safe(mailto)}">Open email app</a><button class="text-button" type="button" data-download-message>Download message</button></div>`;
  $("[data-download-message]", feedback).addEventListener("click", () =>
    downloadText(
      `To: fStore@email.com\nSubject: ${subject}\n\n${body}`,
      "furniture-message.txt",
    ),
  );
});
$$('footer [data-name="Text"]>p')
  .filter((p) =>
    [
      "Orders",
      "Addresses",
      "Returns",
      "Account details",
      "F.A.Q",
      "Return",
      "Free Delivery",
    ].includes(p.textContent.trim()),
  )
  .forEach((p) => {
    const label = p.textContent.trim(),
      b = document.createElement("button");
    b.className = p.className;
    b.textContent = label;
    b.addEventListener("click", () => service(label));
    p.replaceWith(b);
  });
$$('footer [data-name="Social icons"]').forEach((group) =>
  $$(":scope>div", group).forEach((icon, i) => {
    const url = encodeURIComponent(
      "https://antony502189-max.github.io/furniture-store/",
    );
    const href = [
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      `https://twitter.com/intent/tweet?url=${url}`,
      `mailto:?subject=Furniture%20Store&body=${url}`,
      "https://www.youtube.com/results?search_query=furniture+interior+design",
    ][i];
    const a = linkify(icon, href);
    a.setAttribute(
      "aria-label",
      [
        "Share on Facebook",
        "Share on X",
        "Share by email",
        "Furniture inspiration on YouTube",
      ][i],
    );
    a.title = a.getAttribute("aria-label");
    if (!href.startsWith("mailto:")) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  }),
);
$$('[data-action="film"]').forEach((b) =>
  b.setAttribute("aria-label", "View furniture showroom"),
);
// The collection cards also contain calls to action drawn as plain divs.
$$('[data-name="Text+ icon"]')
  .filter((el) => el.textContent.trim() === "Shop now")
  .forEach((el) => {
    const a = linkify(el, "shop.html");
    a.setAttribute("aria-label", "Shop now");
  });
const finalHero = node("1:135");
if (finalHero) {
  finalHero.tabIndex = 0;
  finalHero.role = "button";
  finalHero.setAttribute("aria-label", "Explore furniture");
  finalHero.addEventListener("click", () => (location.href = "shop.html"));
}
$$("p")
  .filter((p) => /^\+[\d\s()-]{7,}$/.test(p.textContent.trim()))
  .forEach((p) => linkify(p, "tel:" + p.textContent.replace(/[^+\d]/g, "")));
$$("p")
  .filter(
    (p) =>
      p.textContent.trim() === "(928) 630-9272" ||
      p.textContent.trim() === "fStore@email.com",
  )
  .forEach((p) =>
    linkify(
      p,
      p.textContent.includes("@")
        ? "mailto:fStore@email.com"
        : "tel:+19286309272",
    ),
  );
const map = $('[data-section="Map+ pin"]');
if (map) {
  const a = document.createElement("a");
  a.className = "primary-button map-link";
  a.href =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("60 Fremont Ave. Hamden, CT 06514");
  a.textContent = "Open address in Google Maps";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  map.append(a);
}
const subject = new URLSearchParams(location.search).get("subject");
if (subject && $("#contact-message"))
  $("#contact-message").value = subject + " enquiry:\n";
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches("[role=button]:not([data-action])")
  ) {
    e.preventDefault();
    e.target.click();
  }
  if (e.key === "Escape" && !panel.open) {
    $(".main-nav")?.classList.remove("open");
    $('[data-action="menu"]')?.setAttribute("aria-expanded", "false");
  }
});
function enhanceStorefront() {
  $$(".product-card").forEach((card) => {
    const p = fromCard(card);
    let options = $('[data-name="Colors"]', card);
    if (!options) {
      options = document.createElement("div");
      options.dataset.name = "Colors";
      ($('[data-name="Text+ colors"]', card) || card).append(options);
    }
    if (options) {
      options.classList.add("color-options");
      options.setAttribute("role", "group");
      options.setAttribute("aria-label", "Choose " + p.title + " color");
      options.innerHTML = swatches(p, p.color);
    }
    if (!$('[data-action="favorite"]', card)) {
      const b = document.createElement("button");
      b.className = "favorite-control added-favorite";
      b.type = "button";
      b.dataset.action = "favorite";
      b.setAttribute("aria-label", "Save " + p.title + " to favorites");
      b.textContent = "♡";
      card.append(b);
    }
    const title = $("h3", card);
    if (title) {
      const b = document.createElement("button");
      b.className = "product-title";
      b.textContent = title.textContent;
      b.dataset.view = p.id;
      title.replaceChildren(b);
    }
  });
  $$("[data-tab]").forEach((tab) =>
    tab.addEventListener("click", () => {
      $$("[data-tab]").forEach((t) =>
        t.setAttribute("aria-pressed", String(t === tab)),
      );
      const section = $('[data-section="New products"]');
      let visible = 0;
      $$(".product-card", section).forEach((c) => {
        const match =
          tab.dataset.tab === "All" || fromCard(c).category === tab.dataset.tab;
        c.hidden = !match;
        if (match) visible++;
      });
      let empty = $(".result-empty", section);
      if (!empty) {
        empty = document.createElement("p");
        empty.className = "result-empty";
        empty.innerHTML =
          'No new arrivals in this category. <a class="text-button" href="shop.html">Explore the full collection</a>';
        section.append(empty);
      }
      empty.hidden = visible > 0;
    }),
  );
  // Sidebar bestsellers open the same product details as the catalog.
  $$('[data-node-id="1:832"]>[data-name]').forEach((item) => {
    const title = $('[data-name="Text"] p', item)?.textContent.trim();
    const p = products.find(
      (p) => p.title.toLowerCase() === title?.toLowerCase(),
    );
    if (p) {
      const ps = $$('[data-name="Text"] p', item);
      if (ps[1]) ps[1].textContent = money(p.price);
      item.tabIndex = 0;
      item.role = "button";
      item.setAttribute("aria-label", "View " + p.title);
      item.addEventListener("click", () => viewProduct(p));
    }
  });
  updateCounters();
  document.body.dataset.storeReady = "true";
  // Template counts are replaced with the available catalog counts.
  $$(
    '[data-section="Categories"] [data-name="Card"], [data-node-id="1:573"]>a',
  ).forEach((link) => {
    const label = $('[data-name="Text"] p', link)?.textContent.trim();
    const count = $$('[data-name="Text"] p', link)[1];
    if (count)
      count.textContent =
        products.filter((p) => p.inCatalog && p.category === label).length + " products";
  });
  $$(
    'input[type="checkbox"]',
    node("1:623") || document.createElement("div"),
  ).forEach((input) => {
    const row = input.parentElement.parentElement;
    const count =
      $(
        ':scope>[data-name="Number"],:scope>p,:scope>[data-name="Counter"]',
        row,
      ) ||
      $$(":scope>div", row).find((x) => /^\d+$/.test(x.textContent.trim()));
    const total = products.filter((p) => p.inCatalog).filter((p) =>
      input.name === "categories"
        ? input.value === "Sale"
          ? p.sale
          : p.category === input.value
        : input.name === "color"
          ? p.colors?.includes(input.value)
          : p.material === input.value,
    ).length;
    if (count) count.textContent = total;
  });
}

// Initialize only after both deferred scripts have executed.
fetch("products.json", { cache: "no-store" })
  .then((r) => {
    if (!r.ok) throw Error("Product data unavailable");
    return r.json();
  })
  .catch(() => {
    toast(
      "Catalog data could not load. Some filters may be unavailable. Please reload.",
    );
    return $$(".product-card").map(fromCard);
  })
  .then((data) => {
    products = data;
    enhanceCatalog();
    enhanceStorefront();
  });
