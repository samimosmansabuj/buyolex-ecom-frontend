const SHOP = { catalog: [], ready: false };
const SORTS = {
    "popularity": "Popularity",
    "price-low-high": "Price: Low to High",
    "price-high-low": "Price: High to Low",
    "newest": "Newest"
};

function shopParams() {
    return new URLSearchParams(location.search);
}

function shopPerPage() {
    return Number(window.SHOP_PER_PAGE) || (window.innerWidth < 768 ? 12 : 18);
}

function setShopParam(key, value, push = false) {
    const par = shopParams();
    if (value === "" || value == null) par.delete(key);
    else par.set(key, value);
    if (key !== "p") par.delete("p");
    if (key === "category") par.delete("c");

    const url = location.pathname + (par.toString() ? "?" + par : "") + location.hash;
    history[push ? "pushState" : "replaceState"](null, "", url);
    renderShop();
}

function shopSort(par) {
    const legacy = { l: "price-low-high", h: "price-high-low" };
    const raw = par.get("sort") || legacy[par.get("s")] || "popularity";
    return SORTS[raw] ? raw : "popularity";
}

function sortProducts(list, sort) {
    if (sort === "price-low-high") list.sort((a, b) => a.price - b.price);
    if (sort === "price-high-low") list.sort((a, b) => b.price - a.price);
    if (sort === "newest") list.sort((a, b) => b.id - a.id);
    return list;
}

function categorySelectHtml(tree, selectedId) {
    const opt = (c, label) => `<option value="${c.id}"${String(c.id) === String(selectedId) ? " selected" : ""}>${esc(label)}</option>`;
    return `<option value="">All</option>` + tree.map(top => (top.children && top.children.length)
        ? `<optgroup label="${esc(top.name)}">${opt(top, top.name + " (all)")}` + top.children.map(ch => opt(ch, ch.name)).join("") + `</optgroup>`
        : opt(top, top.name)).join("");
}

function shopPagerHtml(page, pages, pageUrl) {
    const btn = (label, n, disabled, on) =>
        `<button type="button" class="pg${on ? " on" : ""}" data-spage="${n}"${disabled ? " disabled" : ""}${on ? ' aria-current="page"' : ""}>${label}</button>`;
    return `<div class="pager" aria-label="Pages">` +
        btn("« First", 1, page === 1) + btn("‹ Prev", page - 1, page === 1) +
        Array.from({ length: pages }, (_, i) => btn(i + 1, i + 1, false, i + 1 === page)).join("") +
        btn("Next ›", page + 1, page === pages) + btn("Last »", pages, page === pages) + `</div>`;
}

function priceCap() {
    const top = SHOP.catalog.reduce((m, p) => Math.max(m, Number(p.price) || 0), 0);
    return Math.max(500, Math.ceil(top / 250) * 250);
}

function renderShop() {
    const root = $("#shop-root");
    if (!root || !SHOP.ready) return;
    const CAP = priceCap();

    const par = shopParams();
    const cat = findCategory(par.get("category") || par.get("c"));
    const catIds = cat ? categoryIdsWithChildren(cat) : null;
    const max = Math.min(CAP, Math.max(500, Number(par.get("m")) || CAP));
    const sort = shopSort(par);
    const q = (par.get("q") || "").trim().toLowerCase();

    const list = sortProducts(SHOP.catalog.filter(p =>
        (!cat || catIds.includes(p.categoryId)) && p.price <= max && p.name.toLowerCase().includes(q)), sort);

    const perPage = shopPerPage();
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    const page = Math.min(pages, Math.max(1, Math.floor(Number(par.get("p"))) || 1));
    const visible = list.slice((page - 1) * perPage, page * perPage);

    const chipUrl = target => {
        const n = new URLSearchParams(par);
        n.delete("c"); n.delete("p");
        if (target) n.set("category", target.id); else n.delete("category");
        return "all_product.html" + (n.toString() ? "?" + n : "");
    };
    const chip = (target, label, sub) =>
        `<a class="chip${sub ? " sub" : ""} ${(target ? cat && cat.id === target.id : !cat) ? "on" : ""}" style="color:inherit;text-decoration:none" href="${chipUrl(target)}">${esc(label)}</a>`;

    root.innerHTML =
        `<div class="filter-bar g"><div class="filter-left">` +
        `<label><span>Category:</span><select id="shopCategory">${categorySelectHtml(CATEGORY_TREE, cat ? cat.id : "")}</select></label>` +
        `<label><span>Sort by:</span><select id="shopSort">${Object.entries(SORTS).map(([v, l]) => `<option value="${v}"${v === sort ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>` +
        `<span class="mute" id="shopTotal">${list.length} ${list.length === 1 ? "product" : "products"}</span></div>` +
        `<div class="shop"><aside class="side g"><h4>Category</h4>` +
        chip(null, "All") + CATEGORY_TREE.map(top => chip(top, top.name) + (top.children || []).map(ch => chip(ch, ch.name, true)).join("")).join("") +
        `<h4>Max price: <span id="mv">${fmt(max)}</span></h4>` +
        `<input type="range" min="500" max="${CAP}" step="250" value="${max}" id="rg" aria-label="Maximum price"></aside>` +
        `<section><h2 class="shop-title">${esc(cat ? cat.name : "All products")}</h2>` +
        (list.length
            ? `<div class="grid">${visible.map(p => productCard(p)).join("")}</div>` + (pages > 1 ? shopPagerHtml(page, pages) : "")
            : `<div class="g panel" style="text-align:center"><h2>No matches</h2><p class="mute">Try a different category, a higher price or another search.</p></div>`) +
        `</section></div>`;

    $("#shopCategory").addEventListener("change", e => setShopParam("category", e.target.value, true));
    $("#shopSort").addEventListener("change", e => setShopParam("sort", e.target.value === "popularity" ? "" : e.target.value, true));

    const rg = $("#rg");
    rg.addEventListener("input", () => { $("#mv").textContent = fmt(Number(rg.value)); });
    rg.addEventListener("change", () => setShopParam("m", Number(rg.value) >= CAP ? "" : rg.value, true));
}

document.addEventListener("click", e => {
    const pg = e.target.closest("[data-spage]");
    if (!pg || pg.disabled) return;
    setShopParam("p", Number(pg.dataset.spage) === 1 ? "" : pg.dataset.spage, true);
    const top = $(".shop-title");
    if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.addEventListener("DOMContentLoaded", async () => {
    const root = $("#shop-root");
    if (root) root.innerHTML = `<p class="mute" style="padding:40px 0;text-align:center">Loading products…</p>`;
    const [catalog] = await Promise.all([apiCatalog(), apiCategoryTree()]);
    SHOP.catalog = catalog;
    SHOP.ready = true;
    renderShop();
});

window.addEventListener("popstate", () => {
    const input = $("#q");
    if (input) input.value = shopParams().get("q") || "";
    renderShop();
});


