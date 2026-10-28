function productFeatures(p) {
    return Array.isArray(p.features) ? p.features : [];
}

function productFaqs(p) {
    return Array.isArray(p.faqs) ? p.faqs : [];
}

function specsTable(p) {
    const rows = Object.entries(p.specs || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
    return rows ? `<table class="spec-tbl"><tbody>${rows}</tbody></table>` : "";
}

function starsText(n) {
    const r = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return "★".repeat(r) + "☆".repeat(5 - r);
}

function reviewsHtml(p) {
    const list = Array.isArray(p.reviews) ? p.reviews : [];
    const avg = list.length ? list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / list.length : Number(p.rating) || 0;
    const count = list.length || Number(p.reviewCount) || 0;

    const head = `<div class="rv-head"><div class="rv-num">${avg ? avg.toFixed(1) : "—"}</div>` +
        `<div><div class="stars">${starsText(avg)}</div><div class="mute small">${count ? `${count} review${count === 1 ? "" : "s"}` : "No reviews yet"}</div></div></div>`;

    if (!list.length) return head + (count ? "" : `<div class="rv-empty">No reviews yet. Be the first to review after your order.</div>`);

    return head + list.map(r =>
        `<div class="rv-item"><div class="rv-top"><b>${esc(r.name || "Customer")}</b>` +
        (r.verified ? `<span class="rv-ok">✔ Verified purchase</span>` : "") +
        (r.date ? `<span class="mute small">${esc(r.date)}</span>` : "") + `</div>` +
        `<div class="stars">${starsText(r.rating)}</div><p class="mute">${esc(r.comment || "")}</p></div>`).join("");
}

function faqsHtml(p) {
    return productFaqs(p).map((f, i) =>
        `<details class="faq-item"${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${f.a}</p></details>`).join("");
}

function featuresHtml(p) {
    const cards = productFeatures(p).map(f =>
        `<div class="feat-card"><span class="feat-icon">${esc(f.icon || "✔")}</span><div><div class="feat-name">${esc(f.title)}</div><div class="feat-desc">${esc(f.description)}</div></div></div>`).join("");
    return `<div class="feat-grid">${cards}</div>${specsTable(p) ? `<h3 class="pane-h">Specifications</h3>${specsTable(p)}` : ""}`;
}

function initImageZoom() {
    const big = $("#big"), layer = $("#bigZoom");
    if (!big || !layer) return;

    const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const clamp = n => Math.min(100, Math.max(0, n));

    function point(x, y) {
        const r = big.getBoundingClientRect();
        layer.style.transformOrigin = `${clamp((x - r.left) / r.width * 100)}% ${clamp((y - r.top) / r.height * 100)}%`;
    }
    function reset() {
        big.classList.remove("zoomed");
        layer.style.transformOrigin = "center center";
    }

    big.addEventListener("mouseenter", e => { if (!canHover()) return; point(e.clientX, e.clientY); big.classList.add("zoomed"); });
    big.addEventListener("mousemove", e => { if (canHover()) point(e.clientX, e.clientY); });
    big.addEventListener("mouseleave", reset);

    big.addEventListener("touchstart", e => { const t = e.touches[0]; point(t.clientX, t.clientY); big.classList.add("zoomed"); }, { passive: true });
    big.addEventListener("touchmove", e => { const t = e.touches[0]; point(t.clientX, t.clientY); }, { passive: true });
    big.addEventListener("touchend", reset);
    big.addEventListener("touchcancel", reset);
}

function liveDefaults() {
    return {
        features: [
            { icon: "💵", title: "Cash on delivery", description: "Pay in cash when your order arrives." },
            { icon: "🚚", title: "Delivery all over Bangladesh", description: "The delivery charge is shown at checkout, based on your district." },
            { icon: "↩️", title: "Easy returns", description: "Tell us within 3 days if an item is damaged, defective or wrong." }
        ],
        faqs: [
            { q: "How long does delivery take?", a: "In-stock items ship within 24 hours. We deliver all over Bangladesh." },
            { q: "Is cash on delivery available?", a: "Yes. You pay in cash when the order arrives." },
            { q: "Can I return or exchange it?", a: "Yes, if it arrives damaged, defective or wrong. Contact us within 3 days of delivery with your order number. See the <a href=\"return-policy.html\">return policy</a> for details." },
            { q: "How can I contact you?", a: "Use the <a href=\"contact-us.html\">contact page</a>, WhatsApp or call +880 1306-403604." }
        ]
    };
}

function optionGroups(variants) {
    const groups = [];
    variants.forEach(v => Object.entries(v.attributes || {}).forEach(([name, value]) => {
        let g = groups.find(x => x.name === name);
        if (!g) groups.push(g = { name, values: [] });
        if (!g.values.includes(value)) g.values.push(value);
    }));
    return groups;
}

async function renderProduct() {
    const root = $("#pdp-root");
    if (!root) return;

    const slug = typeof getProductSlug === "function" ? getProductSlug() : new URLSearchParams(location.search).get("slug");
    root.innerHTML = `<div class="done" style="padding:80px 0"><p class="mute">Loading…</p></div>`;

    const [d, catalog] = await Promise.all([slug ? Live.productDetail(slug) : null, apiCatalog().catch(() => [])]);
    if (!d) {
        document.title = "Product not found — Buyolex";
        root.innerHTML = `<div class="done"><h1>Product not found</h1><p class="mute" style="margin:12px 0 24px">That product moved or never existed.</p><a class="cta" href="all_product.html">Back to shop</a></div>`;
        return;
    }

    const listed = Live.productById(d.id) || {};
    const defaults = liveDefaults();
    const p = {
        ...d, category: listed.category || "", categoryId: listed.categoryId || null,
        features: d.features.length ? d.features : defaults.features,
        faqs: d.faqs.length ? d.faqs.map(f => ({ q: f.question, a: esc(f.answer).replace(/\n/g, "<br>") })) : defaults.faqs,
        description: d.shortDescription
    };

    document.title = `${p.name} — Buyolex`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", d.shortDescription || p.name);

    const groups = optionGroups(p.variants);
    const S = { sel: {}, qty: 1, img: 0, custom: false };
    const firstVariant = p.variants.find(v => v.id === p.defaultVariantId) || p.variants.find(v => v.stock > 0) || p.variants[0];
    if (firstVariant) Object.assign(S.sel, firstVariant.attributes);

    const current = () => p.variants.find(v => groups.every(g => v.attributes[g.name] === S.sel[g.name])) || null;
    const stockOf = v => (p.hasVariants ? (v ? v.stock : p.variants.reduce((s, x) => s + x.stock, 0)) : p.stock);
    const images = () => {
        const v = current();
        if (v && v.images.length) return v.images;
        if (v && v.image) return [v.image];
        return p.images.slice();
    };

    const related = catalog.filter(x => x.id !== p.id && x.categoryId && x.categoryId === p.categoryId)
        .concat(catalog.filter(x => x.id !== p.id && !(x.categoryId && x.categoryId === p.categoryId))).slice(0, 4);

    const descHtml = d.descriptionHtml ? safeHtml(d.descriptionHtml) : esc(d.shortDescription);
    const tabs = [
        ["desc", "Description", `<div class="desc-body rich">${descHtml || "<p class='mute'>No description yet.</p>"}</div>`],
        ["feat", "Features", featuresHtml(p)],
        ["rev", "Reviews", reviewsHtml(p)],
        ["faq", "FAQ", faqsHtml(p)]
    ];

    root.innerHTML =
        `<div class="pdp"><div class="gal"><div class="big g" id="big" style="${gradStyle(p)}"><div class="pdp-badges" id="pdpBadges"></div><button type="button" class="share-btn g" id="shareBtn" aria-label="Share this product">🔗</button><div class="big-zoom" id="bigZoom"></div><div class="zoom-hint" aria-hidden="true">+</div></div><div class="thumbs" id="thumbs"></div></div>` +
        `<div class="panel g"><div class="crumb"><a href="/">Home</a> / <a href="all_product.html${p.categoryId ? "?category=" + p.categoryId : ""}">${esc(p.category || "Shop")}</a></div>` +
        `<h1 style="font-size:clamp(30px,4vw,44px)">${esc(p.name)}</h1>` +
        `<div class="stars">${starsText(p.rating)} <span class="mute">${p.rating ? p.rating.toFixed(1) : ""}${p.reviewCount ? ` (${p.reviewCount})` : ""}${p.soldCount ? ` · ${p.soldCount} sold` : ""}${p.isBestseller ? " · 🔥 Bestseller" : ""}</span></div>` +
        (d.shortDescription ? `<p class="mute" style="line-height:1.55">${esc(d.shortDescription)}</p>` : "") +
        `<div id="buyTop"></div><div id="customize"></div><div id="giftBox"></div><div id="buyBottom"></div></div></div>` +
        `<section class="ptabs panel g" id="ptabs"><div class="ptab-nav" role="tablist">` +
        tabs.map((t, i) => `<button type="button" role="tab" id="tab-${t[0]}" aria-selected="${i === 0}" aria-controls="pane-${t[0]}" data-tab="${t[0]}" class="${i === 0 ? "on" : ""}">${t[1]}</button>`).join("") +
        `</div>` +
        tabs.map((t, i) => `<div class="pane${i === 0 ? " on" : ""}" role="tabpanel" id="pane-${t[0]}" aria-labelledby="tab-${t[0]}">${t[2]}</div>`).join("") +
        `</section>` +
        (related.length ? `<h2>You may also like</h2><div class="grid" style="margin-bottom:40px">${related.map(x => productCard(x)).join("")}</div>` : "") +
        `<div class="sticky-buy g" id="stickyBuy" aria-hidden="true"><div class="sb-price"><b id="sbPrice"></b><s id="sbOld"></s></div>` +
        `<button type="button" class="ghost g" id="adS">+ Cart</button><button type="button" class="cta" id="buyNowS">Buy now</button></div>`;

    function paintGallery() {
        const list = images(), layer = $("#bigZoom");
        if (S.img >= list.length) S.img = 0;
        layer.innerHTML = list.length ? `<img src="${esc(list[S.img])}" alt="${esc(p.name)}">` : `<span>🛍</span>`;
        $("#thumbs").innerHTML = list.length > 1
            ? list.map((src, i) => `<button type="button" class="th${i === S.img ? " on" : ""}" data-th="${i}" aria-label="Photo ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join("") : "";
    }

    function optionAvailable(g, value) {
        const others = Object.entries(S.sel).filter(([k]) => k !== g.name);
        const rows = p.variants.filter(v => v.attributes[g.name] === value && others.every(([k, val]) => v.attributes[k] === val));
        return { exists: rows.length > 0, inStock: rows.some(v => v.stock > 0) };
    }

    function paintBuy() {
        const v = current(), stock = stockOf(v), maxQ = Math.max(1, Math.min(99, stock > 0 ? stock : 1));
        S.qty = Math.min(Math.max(1, S.qty), maxQ);
        const price = v ? v.price : p.price, old = v ? v.oldPrice : p.oldPrice;
        const unpicked = p.hasVariants && !v;
        const note = unpicked ? `<span class="stock">Select an option</span>`
            : stock <= 0 ? `<span class="stock out">✕ Out of stock</span>`
            : stock <= 10 ? `<span class="stock low">Only ${stock} left</span>` : `<span class="stock ok">✓ In stock — ships within 24 hours</span>`;
        const opts = groups.map(g =>
            `<div class="optgrp"><div class="lab">${esc(g.name)}: <b style="color:var(--ink)">${esc(S.sel[g.name] || "—")}</b></div><div class="opts">` +
            g.values.map(val => {
                const a = optionAvailable(g, val);
                return `<button type="button" class="opt${a.inStock ? "" : " oos"}" data-g="${esc(g.name)}" data-v="${esc(val)}" aria-pressed="${S.sel[g.name] === val}"${a.exists ? "" : " disabled"}>${esc(val)}</button>`;
            }).join("") + `</div></div>`).join("");

        $("#buyTop").innerHTML =
            `<div class="price">${fmt(price)}${old ? `<s>${fmt(old)}</s>` : ""}${old ? `<em class="off">-${Math.round((1 - price / old) * 100)}%</em>` : ""}</div>` + opts;
        $("#buyBottom").innerHTML =
            `<div class="buy"><div class="qty g"><button id="mn" aria-label="Decrease">−</button><span id="qn">${S.qty}</span><button id="pl" aria-label="Increase">+</button></div>` +
            `<button class="cta" id="ad"${stock <= 0 ? " disabled" : ""}>Add to cart</button>` +
            `<button class="ghost g" id="buyNow"${stock <= 0 ? " disabled" : ""}>Buy now</button>` +
            `<button class="heart2 g" id="wishBtn" aria-label="Save to wishlist">${Live.wish.has(p.id, v ? v.id : null) ? "♥" : "♡"}</button></div>` +
            `<div class="perks">${note}<span>✓ Cash on delivery available</span></div>`;

        $("#pdpBadges").innerHTML = (p.isBestseller ? `<span class="bd bd-best">🔥 Bestseller</span>` : "") +
            (old && old > price ? `<span class="bd bd-off">${Math.round((1 - price / old) * 100)}% OFF</span>` : "");
        $("#sbPrice").textContent = fmt(price);
        $("#sbOld").textContent = old ? fmt(old) : "";
        ["#adS", "#buyNowS"].forEach(sel => { $(sel).disabled = stock <= 0; });
    }

    paintGallery();
    paintBuy();
    function paintCustomize() {
        const box = $("#customize");
        S.custom = false;
        if (!p.hasCustomization) { box.hidden = true; return; }

        const fields = p.customizationFields;
        const form = fields.length
            ? fields.map((f, i) => {
                const ph = esc(f.placeholder || "");
                const req = f.required ? ` <span class="cf-req">*</span>` : "";
                const input = f.type === "textarea" ? `<textarea id="cf_${i}" maxlength="500" placeholder="${ph}"></textarea>`
                    : f.type === "select" ? `<select id="cf_${i}"><option value="">Select...</option>${(f.options || []).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`
                    : f.type === "number" ? `<input type="number" id="cf_${i}" placeholder="${ph}">`
                    : `<input type="text" id="cf_${i}" maxlength="200" placeholder="${ph}">`;
                return `<label class="cf">${esc(f.label)}${req}${input}</label>`;
            }).join("")
            : `<label class="cf"><textarea id="cfNote" maxlength="1000" placeholder="${esc(p.customizationPlaceholder || "Write what you want customized...")}"></textarea></label>`;

        box.hidden = false;
        box.innerHTML = `<div class="lab">Type</div><div class="seg" role="group" aria-label="Standard or customized">` +
            `<button type="button" class="opt" data-mode="standard" aria-pressed="true">Standard</button>` +
            `<button type="button" class="opt" data-mode="custom" aria-pressed="false">Customized</button></div>` +
            `<div class="cf-box" id="cfBox" hidden>${form}</div>`;
    }

    function readCustom() {
        if (!p.hasCustomization || !S.custom) return { ok: true, note: "" };
        const fields = p.customizationFields;
        const bad = (el, msg) => {
            if (el) { el.classList.add("bad"); el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
            toast(msg);
            return { ok: false, note: "" };
        };
        if (!fields.length) {
            const el = $("#cfNote"), note = el.value.trim();
            return note ? { ok: true, note } : bad(el, "Please write what you want customized");
        }
        const lines = [];
        for (let i = 0; i < fields.length; i++) {
            const el = $("#cf_" + i), value = el.value.trim();
            if (!value && fields[i].required) return bad(el, "Please fill: " + fields[i].label);
            if (value) lines.push(`${fields[i].label}: ${value}`);
        }
        if (!lines.length) return bad($("#cf_0"), "Please fill in at least one customization field");
        return { ok: true, note: lines.join("\n").slice(0, 1000) };
    }

    function paintGifts() {
        const box = $("#giftBox");
        const gifts = (p.gifts || []).filter(g => g.gift_product);
        if (!gifts.length) { box.hidden = true; return; }
        box.innerHTML = `<div class="lab">🎁 Comes with</div>` + gifts.map(g => {
            const tag = g.gift_type === "FREE" ? "FREE" : g.gift_type === "FLAT" ? `−৳${esc(g.value)} OFF` : g.gift_type === "DISCOUNT" ? `${esc(g.value)}% OFF` : "";
            const img = Live.abs(g.gift_product.image);
            return `<div class="gift-item">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="gift-ph">🎁</span>`}` +
                `<div><b>${esc(g.gift_product.name || "")}</b>${tag ? `<span class="gift-tag">${tag}</span>` : ""}</div></div>`;
        }).join("");
    }

    function needOption() {
        toast("Please select an option");
        $$(".optgrp").forEach(g => g.classList.add("glow"));
        setTimeout(() => $$(".optgrp").forEach(g => g.classList.remove("glow")), 2500);
        const first = $(".optgrp");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function watchSticky() {
        const bar = $("#stickyBuy"), anchor = $("#buyBottom");
        if (!("IntersectionObserver" in window)) { bar.classList.add("show"); return; }
        new IntersectionObserver(([en]) => {
            const on = !en.isIntersecting && en.boundingClientRect.top < 0;
            bar.classList.toggle("show", on);
            bar.setAttribute("aria-hidden", String(!on));
        }).observe(anchor);
    }

    paintCustomize();
    paintGifts();
    watchSticky();
    initImageZoom();
    if (typeof window.bxTrackViewItem === "function") window.bxTrackViewItem(p);

    root.addEventListener("click", async e => {
        const opt = e.target.closest(".opt[data-g]");
        if (opt && !opt.disabled) {
            const g = opt.dataset.g, val = opt.dataset.v;
            if (S.sel[g] === val) {
                delete S.sel[g];
                S.img = 0;
                paintGallery(); paintBuy();
                return;
            }
            S.sel[g] = val;
            if (!current()) {
                const pick = p.variants.filter(v => v.attributes[g] === val).sort((a, b) => (b.stock > 0) - (a.stock > 0))[0];
                if (pick) S.sel = { ...pick.attributes };
            }
            S.img = 0;
            paintGallery(); paintBuy();
            return;
        }
        const th = e.target.closest("[data-th]");
        if (th) { S.img = Number(th.dataset.th); paintGallery(); return; }

        if (e.target.closest("#mn")) { S.qty = Math.max(1, S.qty - 1); return paintBuy(); }
        if (e.target.closest("#pl")) {
            const stock = stockOf(current());
            if (stock > 0 && S.qty >= stock) return toast(`Only ${stock} in stock`);
            S.qty = Math.min(99, S.qty + 1); return paintBuy();
        }

        if (e.target.closest("#shareBtn")) return shareProduct(p.name);
        const mode = e.target.closest("[data-mode]");
        if (mode) {
            S.custom = mode.dataset.mode === "custom";
            $$("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === mode)));
            $("#cfBox").hidden = !S.custom;
            if (S.custom) { const f = $("#cfBox").querySelector("input,textarea,select"); if (f) f.focus(); }
            return;
        }

        if (e.target.closest("#ad,#adS")) {
            const v = current();
            if (p.hasVariants && !v) return needOption();
            const custom = readCustom();
            if (!custom.ok) return;
            const r = await Live.cart.add(p, v, S.qty, custom.note);
            toast(r.status ? "Added to cart" : r.message);
            if (r.status && typeof window.bxTrackAddToCart === "function") window.bxTrackAddToCart(p, v, S.qty);
            return;
        }
        if (e.target.closest("#buyNow,#buyNowS")) {
            const v = current();
            if (p.hasVariants && !v) return needOption();
            const custom = readCustom();
            if (!custom.ok) return;
            sessionStorage.setItem("bx-buy-now", JSON.stringify(Live.cart.line(p, v, S.qty, custom.note)));
            return goTo("checkout.html?buy=1");
        }
        if (e.target.closest("#wishBtn")) {
            const v = current();
            if (p.hasVariants && !v) return needOption();
            const on = toggleWish(p.id, p, v);
            $("#wishBtn").textContent = on ? "♥" : "♡";
            return toast(on ? "Saved to wishlist" : "Removed from wishlist");
        }
    });

    root.addEventListener("input", e => { if (e.target.closest("#cfBox")) e.target.classList.remove("bad"); });

    $$(".ptab-nav button").forEach(b => b.addEventListener("click", () => {
        $$(".ptab-nav button").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", String(on)); });
        $$("#ptabs .pane").forEach(pane => pane.classList.toggle("on", pane.id === "pane-" + b.dataset.tab));
    }));
}

document.addEventListener("DOMContentLoaded", renderProduct);

function shareProduct(name) {
    const url = location.href;
    if (navigator.share) {
        navigator.share({ title: name, url }).catch(() => null);
        return;
    }
    const el = openPopup("sharePopup",
        `<h3>Share this product</h3><div class="share-row">` +
        `<a class="ghost g" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(name + " " + url)}">WhatsApp</a>` +
        `<a class="ghost g" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>` +
        `<button type="button" class="ghost g" data-copy>Copy link</button></div>` +
        `<button type="button" class="ghost g" data-close style="margin-top:12px">Close</button>`);
    el.addEventListener("click", async e => {
        if (e.target.closest("[data-close]")) return el.remove();
        if (!e.target.closest("[data-copy]")) return;
        try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch (err) { toast("Could not copy the link"); }
        el.remove();
    });
}


