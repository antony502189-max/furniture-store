/* Static storefront interactions. Data stays in this browser. */
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const node = (id) => $(`[data-node-id="${id}"]`);
const safe = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
function readSaved(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
let favorites = readSaved("furniture-favorites", []),
  cart = readSaved("furniture-cart", []);
const validItem = (p) =>
  p &&
  typeof p.id === "string" &&
  typeof p.title === "string" &&
  Number.isFinite(p.price) &&
  p.price >= 0 &&
  typeof p.image === "string" &&
  /^assets\/[\w./-]+$/.test(p.image);
favorites = Array.isArray(favorites) ? favorites.filter(validItem) : [];
cart = Array.isArray(cart)
  ? cart.filter(
      (p) => validItem(p) && Number.isInteger(p.quantity) && p.quantity > 0,
    )
  : [];
let products = [];
const panel = $("#panel");
let returnFocus = null;
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3000);
}
function persist() {
  try {
    localStorage.setItem("furniture-favorites", JSON.stringify(favorites));
    localStorage.setItem("furniture-cart", JSON.stringify(cart));
  } catch {
    toast(
      "Browser storage is unavailable. Your selections will last for this visit.",
    );
  }
  updateCounters();
}
function updateCounters() {
  $$('[data-count="favorites"]').forEach(
    (n) => (n.textContent = favorites.length),
  );
  $$('[data-count="cart"]').forEach(
    (n) => (n.textContent = cart.reduce((s, p) => s + p.quantity, 0)),
  );
  $$('[data-action="favorite"]').forEach((b) => {
    const saved = favorites.some(
      (p) => p.id === b.closest("[data-product]")?.dataset.product,
    );
    b.setAttribute("aria-pressed", String(saved));
  });
}
function showPanel(title, body) {
  if (!panel.open) returnFocus = document.activeElement;
  $("#panel-content").innerHTML =
    `<h2 id="panel-title" class="dialog-heading">${safe(title)}</h2>${body}`;
  if (!panel.open) panel.showModal();
  $("#panel-title").tabIndex = -1;
  $("#panel-title").focus();
}
panel.addEventListener("close", () => {
  if (returnFocus?.isConnected) returnFocus.focus();
});
panel.addEventListener("click", (e) => {
  if (e.target === panel) {
    const r = panel.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      panel.close();
  }
});
function fromCard(card) {
  const p = products.find((p) => p.id === card.dataset.product);
  return {
    ...p,
    id: card.dataset.product,
    title: card.dataset.title,
    color: card.dataset.selectedColor || p?.colors?.[0] || "Grey",
    price: p?.price ?? Number(card.dataset.price),
    image: $("[data-product-photo]", card)?.getAttribute("src"),
  };
}
function product(id) {
  return (
    products.find((p) => p.id === id) ||
    favorites.find((p) => p.id === id) ||
    cart.find((p) => p.id === id)
  );
}
function addToCart(p) {
  if (!p) return;
  const existing = cart.find(
    (x) => x.id === p.id && (x.color || "Grey") === (p.color || "Grey"),
  );
  if (existing) existing.quantity++;
  else cart.push({ ...p, quantity: 1 });
  persist();
  toast(p.title + " added to bag");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(
    "[data-action],[data-add],[data-remove],[data-quantity]",
  );
  if (!b) return;
  if (b.dataset.add) {
    const selected = panel.dataset.activeProduct
      ? JSON.parse(panel.dataset.activeProduct)
      : null;
    addToCart(
      selected?.id === b.dataset.add ? selected : product(b.dataset.add),
    );
    return;
  }
  if (b.dataset.remove) {
    if (b.dataset.kind === "cart")
      cart = cart.filter(
        (x) => x.id + ":" + (x.color || "Grey") !== b.dataset.remove,
      );
    else favorites = favorites.filter((x) => x.id !== b.dataset.remove);
    persist();
    collection(b.dataset.kind);
    return;
  }
  if (b.dataset.quantity) {
    const p = cart.find(
      (x) => x.id + ":" + (x.color || "Grey") === b.dataset.quantity,
    );
    if (p) p.quantity += Number(b.dataset.delta);
    cart = cart.filter((x) => x.quantity > 0);
    persist();
    collection("cart");
    return;
  }
  const action = b.dataset.action;
  if (action === "close") panel.close();
  if (action === "menu") {
    const nav = $(".main-nav");
    nav.classList.toggle("open");
    b.setAttribute("aria-expanded", String(nav.classList.contains("open")));
  }
  if (action === "product") {
    viewProduct(fromCard(b.closest("[data-product]")));
  }
  if (action === "favorite") {
    e.stopPropagation();
    const p = fromCard(b.closest("[data-product]"));
    const saved = favorites.some((x) => x.id === p.id);
    favorites = saved
      ? favorites.filter((x) => x.id !== p.id)
      : [...favorites, p];
    persist();
    toast(saved ? "Removed from favorites" : p.title + " saved to favorites");
  }
  if (action === "favorites" || action === "cart") collection(action);
  if (action === "account") showAccount();
  if (action === "film") showGallery();
});
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches("[role=button][data-action]")
  ) {
    e.preventDefault();
    e.target.click();
  }
});
function linkify(el, href) {
  if (!el) return;
  const a = document.createElement("a");
  for (const attr of el.attributes) a.setAttribute(attr.name, attr.value);
  a.href = href;
  a.innerHTML = el.innerHTML;
  el.replaceWith(a);
  return a;
}
linkify(node("1:140"), "shop.html");
$$('[data-section="Categories"] [data-name="Card"]').forEach((c) => {
  const title = $('[data-name="Text"] p', c)?.textContent.trim();
  linkify(c, "shop.html?category=" + encodeURIComponent(title || ""));
});
$$('[data-section="Gallery"] [data-name="Img+label"]').forEach((c) => {
  const title = $('[data-name="Label"]', c)?.textContent.trim();
  linkify(c, "shop.html?room=" + encodeURIComponent(title || ""));
});
$$('[data-node-id="1:573"]>[data-name="Icon+ text"]').forEach((c) => {
  const title = $('[data-name="Text"] p', c)?.textContent.trim();
  linkify(c, "shop.html?category=" + encodeURIComponent(title || ""));
});
const readMore = node("1:1210");
if (readMore) {
  readMore.tabIndex = 0;
  readMore.role = "button";
  readMore.addEventListener("click", () =>
    showPanel(
      "Our approach",
      '<p>Furniture designed around comfort, everyday living and timeless shapes.</p><p class="dialog-note">' +
        safe(node("1:1209").textContent) +
        "</p>",
    ),
  );
}
$$('[data-section="Info block 4"] [data-name="Button"]').forEach((b) => {
  if (b.tagName !== "A" && b.textContent.trim() === "Shop now")
    linkify(b, "shop.html");
});
$$('[data-section="Hero"] [data-name="Card"]').forEach((c) => {
  c.tabIndex = 0;
  c.role = "button";
  c.setAttribute("aria-label", "Explore furniture");
  c.addEventListener("click", () => (location.href = "shop.html"));
});
function enhanceCatalog() {
  const area = node("1:622");
  if (!area) return;
  const results = node("1:853"),
    grid = node("1:861"),
    toolbar = node("1:854"),
    filters = node("1:623");
  results.classList.add("catalog-results");
  toolbar.classList.add("catalog-toolbar");
  grid.classList.add("catalog-grid");
  const cards = $$(".product-card", grid);
  cards.forEach((card) => {
    const p = products.find((p) => p.id === card.dataset.product);
    if (p)
      Object.assign(card.dataset, {
        category: p.category,
        material: p.material,
        color: p.colors?.[0] || "Grey",
        room: p.room,
      });
  });
  const sortOld = node("1:856");
  const select = document.createElement("select");
  select.className = "catalog-sort";
  select.setAttribute("aria-label", "Sort products");
  select.innerHTML =
    '<option value="latest">Sort by latest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option>';
  sortOld.replaceWith(select);
  const count = node("1:855");
  count.setAttribute("role", "status");
  const filterToggle = document.createElement("button");
  filterToggle.className = "filter-toggle";
  filterToggle.textContent = "Filters";
  filterToggle.setAttribute("aria-expanded", "false");
  filterToggle.setAttribute("aria-controls", "catalog-filters");
  filters.id = "catalog-filters";
  area.prepend(filterToggle);
  filterToggle.addEventListener("click", () => {
    filters.classList.toggle("open");
    filterToggle.setAttribute(
      "aria-expanded",
      String(filters.classList.contains("open")),
    );
  });
  const priceLine = node("1:626");
  const price = document.createElement("input");
  price.className = "filter-price";
  price.type = "range";
  price.min = 0;
  price.max = Math.max(...cards.map((c) => Number(c.dataset.price)));
  price.step = 1;
  price.value = price.max;
  price.setAttribute("aria-label", "Maximum price");
  priceLine.replaceWith(price);
  const priceLabel = node("1:630");
  priceLabel.textContent = "Price: $0 – $9999";
  const reset = document.createElement("button");
  reset.className = "filter-reset";
  reset.textContent = "Reset filters";
  filters.append(reset);
  const empty = document.createElement("p");
  empty.className = "result-empty";
  empty.textContent =
    "No products match your filters. Try another category or reset the filters.";
  empty.hidden = true;
  results.append(empty);
  const params = new URLSearchParams(location.search),
    q = (params.get("q") || "").trim().toLowerCase(),
    room = params.get("room") || "";
  let category = params.get("category") || "";
  const search = $("input[name=q]");
  if (search) search.value = params.get("q") || "";
  const headerCategory = $(".search-form select");
  headerCategory.value = category;
  if (category)
    $$("input[name=categories]", filters)
      .filter((c) => c.value === category)
      .forEach((c) => (c.checked = true));
  const brandLogos = $$('[data-name="Brands"]>div', filters);
  brandLogos.forEach((b, i) => {
    b.role = "button";
    b.tabIndex = 0;
    b.setAttribute("aria-label", "Filter by brand " + (i + 1));
    b.setAttribute("aria-pressed", "false");
    b.dataset.brand = String(i);
    b.style.cursor = "pointer";
    b.addEventListener("click", () => {
      b.setAttribute(
        "aria-pressed",
        String(b.getAttribute("aria-pressed") !== "true"),
      );
      currentPage = 1;
      apply();
    });
  });
  let cleared = false,
    currentPage = 1;
  const pageSize = 6;
  const paging = node("1:990");
  paging.className = "pagination";
  paging.setAttribute("aria-label", "Catalog pages");
  paging.addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled) return;
    currentPage = Number(b.dataset.page);
    apply();
    toolbar.scrollIntoView({ block: "start" });
  });
  const categoryGroup = $("input[name=categories]", filters)?.parentElement
    .parentElement.parentElement;
  ["Tables", "Armchairs"].forEach((value) => {
    if (categoryGroup && !$(`input[value="${value}"]`, categoryGroup)) {
      const label = document.createElement("label");
      label.className = "extra-category";
      label.innerHTML = `<input type="checkbox" class="filter-checkbox" name="categories" value="${value}">${value}`;
      categoryGroup.append(label);
      if (category === value) $("input", label).checked = true;
    }
  });
  function apply() {
    const categories = $$("input[name=categories]:checked", filters).map(
        (c) => c.value,
      ),
      colors = $$("input[name=color]:checked", filters).map((c) => c.value),
      materials = $$(
        "input[name=masterial]:checked,input[name=material]:checked",
        filters,
      ).map((c) => c.value),
      brands = brandLogos
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map((b) => Number(b.dataset.brand));
    let filtered = cards.filter((c, i) => {
      const matchCategory = categories.length
        ? categories.some((x) =>
            x === "Sale"
              ? product(c.dataset.product)?.sale
              : x === c.dataset.category,
          )
        : !category ||
          cleared ||
          (category === "Sale" && product(c.dataset.product)?.sale) ||
          c.dataset.category === category;
      return (
        (cleared || !q || c.dataset.title.toLowerCase().includes(q)) &&
        matchCategory &&
        (cleared || !room || c.dataset.room === room) &&
        Number(c.dataset.price) <= Number(price.value) &&
        (!colors.length ||
          colors.some((color) =>
            product(c.dataset.product)?.colors?.includes(color),
          )) &&
        (!materials.length || materials.includes(c.dataset.material)) &&
        (!brands.length || brands.includes(product(c.dataset.product)?.brand))
      );
    });
    if (select.value === "price-asc")
      filtered.sort((a, b) => a.dataset.price - b.dataset.price);
    if (select.value === "price-desc")
      filtered.sort((a, b) => b.dataset.price - a.dataset.price);
    if (select.value === "name")
      filtered.sort((a, b) => a.dataset.title.localeCompare(b.dataset.title));
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * pageSize;
    cards.forEach((c) => (c.hidden = true));
    filtered.slice(start, start + pageSize).forEach((c) => {
      c.hidden = false;
      grid.append(c);
    });
    count.textContent = filtered.length
      ? `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} results`
      : "Showing 0 results";
    empty.hidden = filtered.length > 0;
    priceLabel.textContent = "Price: $0 – " + money(Number(price.value));
    paging.innerHTML = `<button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>Previous</button><div class="pages">${Array.from({ length: pages }, (_, i) => `<button data-page="${i + 1}" aria-label="Page ${i + 1}" ${currentPage === i + 1 ? 'aria-current="page"' : ""}>${i + 1}</button>`).join("")}</div><button data-page="${currentPage + 1}" ${currentPage === pages ? "disabled" : ""}>Next ›</button>`;
  }
  reset.addEventListener("click", () => {
    cleared = true;
    currentPage = 1;
    $$("input[type=checkbox]", filters).forEach((c) => (c.checked = false));
    brandLogos.forEach((b) => b.setAttribute("aria-pressed", "false"));
    price.value = price.max;
    select.value = "latest";
    if (search) search.value = "";
    headerCategory.value = "";
    history.replaceState(null, "", location.pathname);
    apply();
  });
  filters.addEventListener("change", (e) => {
    if (e.target.name === "categories") category = "";
    currentPage = 1;
    apply();
  });
  price.addEventListener("input", () => {
    currentPage = 1;
    apply();
  });
  select.addEventListener("change", () => {
    currentPage = 1;
    apply();
  });

  apply();
}
updateCounters();
