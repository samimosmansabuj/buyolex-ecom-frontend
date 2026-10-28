const HOME_STATE = { catalog: [], cat: "all", sort: "popularity", page: 1, perPage: 8 };
let SECTION_FLAGS = {};
const sectionOn = key => SECTION_FLAGS[key] !== false;

const DEFAULT_WHY = [
    { icon: "🚚", title: "Delivery nationwide", description: "We deliver all over Bangladesh." },
    { icon: "💵", title: "Cash on delivery", description: "Pay when your order arrives." },
    { icon: "📱", title: "bKash & Nagad", description: "Prefer paying online? Mobile payment works too." },
    { icon: "🤝", title: "Real support", description: "Call or email us. A person answers." }
];

let slideIndex = 0, slideTimer = null;

function renderHero(slides) {
    const slider = $("#heroSlider"), fallback = $("#heroFallback");
    if (!sectionOn("hero_slider")) { slider.hidden = true; fallback.hidden = true; return; }
    if (!slides.length) { slider.hidden = true; fallback.hidden = false; return; }

    fallback.hidden = true;
    slider.hidden = false;
    slider.innerHTML = slides.map((s, i) => {
        const img = resolveAssetUrl(s.image);
        return `<div class="slide${i === 0 ? " active" : ""}"><div class="slide-text"><h2>${esc(s.title)}</h2>` +
            (s.price ? `<p>${fmt(s.price)}</p>` : "") +
            `<a class="cta" href="${esc(safeHref(s.url))}">${esc(s.button_name || "Shop now")}</a></div>` +
            `<div class="slide-img">${img ? `<img src="${esc(img)}" alt="${esc(s.title)}">` : ""}</div></div>`;
    }).join("") +
        (slides.length > 1
            ? `<button type="button" class="slide-prev g" data-slide="-1" aria-label="Previous slide">‹</button>` +
              `<button type="button" class="slide-next g" data-slide="1" aria-label="Next slide">›</button>` +
              `<div class="slider-dots">${slides.map((_, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-slide-to="${i}" aria-label="Slide ${i + 1}"></button>`).join("")}</div>`
            : "");

    slideIndex = 0;
    startSlider(slides.length);
}

function showSlide(i) {
    const slides = $$("#heroSlider .slide");
    if (!slides.length) return;
    slideIndex = (i + slides.length) % slides.length;
    slides.forEach((el, n) => el.classList.toggle("active", n === slideIndex));
    $$("#heroSlider .slider-dots button").forEach((el, n) => el.classList.toggle("active", n === slideIndex));
}

function startSlider(count) {
    clearInterval(slideTimer);
    if (count < 2 || window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    slideTimer = setInterval(() => showSlide(slideIndex + 1), 5000);
}

function renderFeatured(catalog) {
    const section = $("#kidzProductSection");
    const items = catalog.slice(0, 10);
    section.hidden = !sectionOn("kidz_product") || !items.length;
    if (!section.hidden) $("#featuredSlider").innerHTML = items.map(p => productCard(p)).join("");
}

function categoryOptionsHtml(tree) {
    return `<option value="all">All</option>` + tree.map(c => (c.children && c.children.length)
        ? `<optgroup label="${esc(c.name)}"><option value="${c.id}">${esc(c.name)} (all)</option>` +
          c.children.map(ch => `<option value="${ch.id}">${esc(ch.name)}</option>`).join("") + `</optgroup>`
        : `<option value="${c.id}">${esc(c.name)}</option>`).join("");
}

function filteredCatalog() {
    let list = HOME_STATE.catalog.slice();
    if (HOME_STATE.cat !== "all") {
        const cat = findCategory(HOME_STATE.cat);
        const ids = cat ? categoryIdsWithChildren(cat) : [];
        list = list.filter(p => ids.includes(p.categoryId) || (cat && p.category === cat.name));
    }
    if (HOME_STATE.sort === "price-low-high") list.sort((a, b) => a.price - b.price);
    if (HOME_STATE.sort === "price-high-low") list.sort((a, b) => b.price - a.price);
    if (HOME_STATE.sort === "newest") list.sort((a, b) => b.id - a.id);
    return list;
}

function renderHomeGrid() {
    const list = filteredCatalog();
    const pages = Math.max(1, Math.ceil(list.length / HOME_STATE.perPage));
    HOME_STATE.page = Math.min(pages, Math.max(1, HOME_STATE.page));
    const from = (HOME_STATE.page - 1) * HOME_STATE.perPage;

    $("#totalProducts").textContent = list.length + (list.length === 1 ? " product" : " products");
    $("#productsGrid").innerHTML = list.length
        ? list.slice(from, from + HOME_STATE.perPage).map(p => productCard(p)).join("")
        : `<div class="g panel" style="grid-column:1/-1;text-align:center"><p class="mute">No products found in this category.</p></div>`;

    const btn = (label, page, disabled, on) =>
        `<button type="button" class="pg${on ? " on" : ""}" data-hpage="${page}"${disabled ? " disabled" : ""}>${label}</button>`;
    $("#homePager").innerHTML = pages > 1
        ? btn("« First", 1, HOME_STATE.page === 1) + btn("‹ Prev", HOME_STATE.page - 1, HOME_STATE.page === 1) +
          Array.from({ length: pages }, (_, i) => btn(i + 1, i + 1, false, i + 1 === HOME_STATE.page)).join("") +
          btn("Next ›", HOME_STATE.page + 1, HOME_STATE.page === pages) + btn("Last »", pages, HOME_STATE.page === pages)
        : "";
}

function renderFilterSection(tree) {
    const section = $("#filterProductsSection");
    section.hidden = !sectionOn("filter_products_grid");
    if (section.hidden) return;
    $("#filterCategory").innerHTML = categoryOptionsHtml(tree);
    renderHomeGrid();
}

function renderWhy(cards) {
    const section = $("#whyChooseSection");
    section.hidden = !sectionOn("why_choose") || !cards.length;
    if (section.hidden) return;
    $("#whyChooseGrid").innerHTML = cards.map(c =>
        `<div class="why-card g"><div class="why-icon">${esc(c.icon || "")}</div><div class="why-name">${esc(c.title)}</div><div class="why-desc">${esc(c.description || "")}</div></div>`).join("");
}

function safeCssColor(c) { return /^#[0-9a-fA-F]{3,8}$/.test(c || "") ? c : ""; }

function hexToRgba(hex, opacityPercent) {
    hex = String(hex || "").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    const n = Number(opacityPercent);
    const a = Math.max(0, Math.min(100, Number.isNaN(n) ? 100 : n)) / 100;
    return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${a})`;
}

function textStyleCss(st) {
    if (!st) return "";
    let css = "";
    if (st.font_family) css += `font-family:'${String(st.font_family).replace(/['"\\;<>]/g, "")}',sans-serif;`;
    if (Number(st.font_size)) css += `font-size:${Number(st.font_size)}px;`;
    if (st.weight === "bold") css += "font-weight:700;"; else if (st.weight === "normal") css += "font-weight:400;";
    if (st.italic === "italic") css += "font-style:italic;"; else if (st.italic === "normal") css += "font-style:normal;";
    if (safeCssColor(st.color)) css += `color:${st.color};`;
    const bg = hexToRgba(st.bg_color, st.bg_opacity);
    if (bg) css += `background:${bg};padding:6px 12px;border-radius:8px;`;
    if (st.align || bg) {
        css += "width:fit-content;max-width:100%;";
        if (st.align === "center") css += "margin-left:auto;margin-right:auto;text-align:center;";
        else if (st.align === "right") css += "margin-left:auto;text-align:right;";
        else css += "margin-right:auto;text-align:left;";
    }
    return css;
}

const _loadedFonts = new Set();
function loadSectionFonts(sections) {
    sections.forEach(s => [s.heading_style, s.subheading_style].forEach(st => {
        const f = st && String(st.font_family || "").replace(/[^\w \-]/g, "");
        if (!f || _loadedFonts.has(f)) return;
        _loadedFonts.add(f);
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
        document.head.appendChild(link);
    }));
}

function sectionHead(s) {
    if (!s.heading && !s.subheading) return "";
    return `<div class="lp-head">` +
        (s.heading ? `<h2 class="lp-title" style="${textStyleCss(s.heading_style)}">${esc(s.heading)}</h2>` : "") +
        (s.subheading ? `<div class="custom-section-subheading" style="${textStyleCss(s.subheading_style)}">${esc(s.subheading)}</div>` : "") + `</div>`;
}

function sectionButton(s) {
    return s.button_text && s.button_url ? `<a class="cta custom-section-btn" href="${esc(safeHref(s.button_url))}">${esc(s.button_text)}</a>` : "";
}

const apiCards = (items, badge) => (items || []).map(it => productCard(normalizeApiProduct(it), badge ? { badge } : {})).join("");

function renderCustomSection(s) {
    const wrap = document.createElement("section");
    wrap.className = `lp-section custom-home-section size-${["compact", "normal", "spacious"].includes(s.size) ? s.size : "normal"}`;
    wrap.id = "customSection_" + String(s.section_key || s.id).replace(/[^\w-]/g, "");
    if (s.min_height_px && s.design_style !== "banner_product_combo") wrap.style.minHeight = Number(s.min_height_px) + "px";

    if (s.content_type !== "product") {
        const img = resolveAssetUrl(s.image);
        wrap.innerHTML = (s.heading ? `<div class="lp-head"><h2 class="lp-title" style="${textStyleCss(s.heading_style)}">${esc(s.heading)}</h2></div>` : "") +
            `<div class="custom-section-body g">${img ? `<img class="custom-section-image" src="${esc(img)}" alt="${esc(s.heading || "")}">` : ""}` +
            (s.subheading ? `<div class="custom-section-subheading" style="${textStyleCss(s.subheading_style)}">${esc(s.subheading)}</div>` : "") +
            (s.body_html ? `<div class="custom-section-text">${esc(s.body_html)}</div>` : "") + sectionButton(s) + `</div>`;
        return wrap;
    }

    const items = s.items || [], tabs = s.tabs || [];
    const style = s.design_style;

    if (style === "tabbed_products") {
        if (!tabs.some(t => (t.items || []).length)) return null;
        wrap.innerHTML = sectionHead(s) + `<div class="home-tabs"><div class="home-tabs-nav">` +
            tabs.map((t, i) => `<button type="button" class="home-tab-btn${i ? "" : " active"}" data-tab-index="${i}">${esc(t.name)}</button>`).join("") + `</div>` +
            tabs.map((t, i) => `<div class="home-tab-panel${i ? "" : " active"}" data-tab-panel="${i}"><div class="grid">${apiCards(t.items)}</div></div>`).join("") + `</div>`;
        return wrap;
    }
    if (!items.length) return null;

    if (style === "category_tiles") {
        wrap.innerHTML = sectionHead(s) + `<div class="category-tiles-grid">` + items.map((c, i) => {
            const banner = resolveAssetUrl(c.banner);
            const [c1, c2] = SHOWCASE_TINTS[i % SHOWCASE_TINTS.length];
            return `<a class="category-tile g" href="all_product.html?category=${Number(c.id)}"><div class="category-tile-img" style="background:linear-gradient(145deg,${c1},${c2})">` +
                (banner ? `<img src="${esc(banner)}" alt="${esc(c.name)}" loading="lazy">` : `<span>${esc(c.icon || "🛍️")}</span>`) +
                `</div><div class="category-tile-name">${esc(c.name)}</div></a>`;
        }).join("") + `</div>`;
        return wrap;
    }
    if (style === "banner_product_combo") {
        const img = resolveAssetUrl(s.image);
        wrap.innerHTML = `<div class="banner-product-combo"><div class="combo-banner g"${s.min_height_px ? ` style="min-height:${Number(s.min_height_px)}px"` : ""}>` +
            (img ? `<img class="combo-banner-image" src="${esc(img)}" alt="${esc(s.heading || "")}">` : "") + `<div class="combo-banner-text">` +
            (s.heading ? `<h2 class="lp-title" style="${textStyleCss(s.heading_style)}">${esc(s.heading)}</h2>` : "") +
            (s.subheading ? `<div class="custom-section-subheading" style="${textStyleCss(s.subheading_style)}">${esc(s.subheading)}</div>` : "") +
            (s.body_html ? `<div class="custom-section-text">${esc(s.body_html)}</div>` : "") + sectionButton(s) +
            `</div></div><div class="products-slider combo-products">${apiCards(items)}</div></div>`;
        return wrap;
    }
    const badge = style === "bestseller_strip" ? (s.badge_text || "Best Seller") : "";
    wrap.innerHTML = sectionHead(s) + `<div class="${style === "product_slider" ? "products-slider" : "grid"}">${apiCards(items, badge)}</div>`;
    return wrap;
}

function renderCustomSections(list) {
    const box = $("#customSections");
    box.textContent = "";
    const sorted = list.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    loadSectionFonts(sorted);
    sorted.forEach(s => { const el = renderCustomSection(s); if (el) box.appendChild(el); });
}

async function renderHome() {
    const [content, slides, media, tree, catalog] = await Promise.all(
        [apiSiteContent(), apiHomeSlider(), apiShowcaseMedia(), apiCategoryTree(), apiCatalog()]);

    SECTION_FLAGS = (content && content.sections) || {};
    HOME_STATE.catalog = catalog;

    renderHero(slides);
    renderFeatured(catalog);
    renderFilterSection(tree);
    $("#socialProofSection").hidden = !sectionOn("social_proof_banner");
    renderWhy(content && Array.isArray(content.why_choose_us) ? content.why_choose_us : DEFAULT_WHY);
    renderShowcase(media);
    renderCustomSections((content && content.custom_sections) || []);
    $("#ecoSection").hidden = !sectionOn("ecosystem");
}

document.addEventListener("DOMContentLoaded", () => {
    renderHome();

    const nl = $("#nl");
    if (nl) nl.addEventListener("submit", e => { e.preventDefault(); nl.reset(); toast("Subscribed. Check your inbox for your code."); });

    $("#filterCategory").addEventListener("change", e => { HOME_STATE.cat = e.target.value; HOME_STATE.page = 1; renderHomeGrid(); });
    $("#sortBy").addEventListener("change", e => { HOME_STATE.sort = e.target.value; HOME_STATE.page = 1; renderHomeGrid(); });
});

document.addEventListener("click", e => {
    const slide = e.target.closest("[data-slide],[data-slide-to]");
    if (slide) {
        showSlide(slide.dataset.slideTo !== undefined ? Number(slide.dataset.slideTo) : slideIndex + Number(slide.dataset.slide));
        startSlider($$("#heroSlider .slide").length);
        return;
    }
    const page = e.target.closest("[data-hpage]");
    if (page && !page.disabled) {
        HOME_STATE.page = Number(page.dataset.hpage);
        renderHomeGrid();
        $("#filterProductsSection").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
    }
    const tab = e.target.closest(".home-tab-btn");
    if (tab) {
        const root = tab.closest(".home-tabs");
        $$(".home-tab-btn", root).forEach(b => b.classList.toggle("active", b === tab));
        $$(".home-tab-panel", root).forEach(p => p.classList.toggle("active", p.dataset.tabPanel === tab.dataset.tabIndex));
        return;
    }
});


