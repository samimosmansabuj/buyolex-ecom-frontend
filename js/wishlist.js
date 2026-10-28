function wishItems() {
    return Object.entries(Live.wish.rows()).map(([key, r]) => ({ key, ...r }));
}

function wishCard(r) {
    const p = { id: r.id, slug: r.slug, name: r.n, image: r.im, price: r.p, oldPrice: r.op, emoji: "", colors: ["#1b8f8a", "#00383b"], category: r.v || "", fromApi: true };
    return `<div class="wish-item" data-wk="${esc(r.key)}">${productCard(p, { noAdd: true })}<div class="wish-actions">` +
        `<button type="button" class="cta" data-wm>Move to cart</button>` +
        `<button type="button" class="ghost g" data-wr>Remove</button></div></div>`;
}

function renderWishlist() {
    const root = $("#wish-root");
    if (!root) return;

    const items = wishItems();
    $("#wishCountText").textContent = items.length + (items.length === 1 ? " item" : " items");

    if (!items.length) {
        root.innerHTML = `<div class="done" style="padding:60px 0"><div class="ck" style="background:var(--glass);color:var(--ink)">♡</div><h2>Your wishlist is empty</h2><p class="mute" style="margin:10px 0 20px">Tap the heart on any product to save it here.</p><a class="cta" href="all_product.html">Browse products</a></div>`;
        return;
    }
    root.innerHTML = `<div class="grid">${items.map(wishCard).join("")}</div>`;
}

async function rowCartTarget(row) {
    let prod = Live.productById(row.id);
    if (row.slug && (!prod || (!row.vid && prod.hasVariants))) {
        const detail = await Live.productDetail(row.slug);
        if (detail) prod = detail;
    }
    prod = prod || { id: row.id, slug: row.slug, name: row.n, image: row.im, price: row.p, oldPrice: row.op };

    let variant = null;
    if (row.vid) {
        variant = (prod.variants || []).find(v => v.id === row.vid) || { id: row.vid, label: row.v, price: row.p, oldPrice: row.op, image: row.im };
    } else if (prod.hasVariants) {
        variant = prod.variants.find(v => v.id === prod.defaultVariantId) || prod.variants.find(v => v.stock > 0) || prod.variants[0];
    }
    return { prod, variant };
}

async function wishRowToCart(key) {
    const row = Live.wish.rows()[key];
    if (!row) return;

    const { prod, variant } = await rowCartTarget(row);
    const r = await Live.cart.add(prod, variant, 1);
    if (!r.status) return toast(r.message || "Could not add this to your cart");

    if (typeof window.bxTrackAddToCart === "function") window.bxTrackAddToCart(prod, variant, 1);
    Live.wish.remove(key);
    toast("Moved to cart");
}

document.addEventListener("click", e => {
    const wrap = e.target.closest("[data-wk]");
    if (!wrap) return;
    const key = wrap.dataset.wk;

    if (e.target.closest("[data-wm]")) return wishRowToCart(key);
    if (e.target.closest("[data-wr],.heart")) {
        e.preventDefault();
        Live.wish.remove(key);
        toast("Removed from wishlist");
    }
});

document.addEventListener("wish:changed", renderWishlist);
document.addEventListener("DOMContentLoaded", async () => {
    renderWishlist();
    try { await apiCatalog(); } catch (e) {  }
    renderWishlist();
});


