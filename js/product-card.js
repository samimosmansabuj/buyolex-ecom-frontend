function productCard(p, opts = {}) {
    const badge = opts.badge || p.tag;
    const media = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : esc(p.emoji);
    return `<a class="card g" href="${productUrl(p)}">` +
        `<button class="heart g" data-w="${p.id}" aria-label="Save to wishlist">${isWished(p.id) ? "♥" : "♡"}</button>` +
        (badge ? `<span class="badge">${esc(badge)}</span>` : "") +
        `<div class="img" style="${gradStyle(p)}">${media}</div>` +
        `<h3>${esc(p.name)}</h3>` +
        `<div class="meta">${p.rating ? "★ " + p.rating + " · " : ""}${esc(p.category)}</div>` +
        `<div class="pr"><span><b>${fmt(p.price)}</b>${p.oldPrice ? `<s>${fmt(p.oldPrice)}</s>` : ""}</span>` +
        (opts.noAdd ? "" : `<button data-a="${p.id}" aria-label="Add ${esc(p.name)} to cart">+</button>`) + `</div></a>`;
}

document.addEventListener("click", e => {
    const t = e.target.closest("[data-a],[data-w]");
    if (!t || t.closest("[data-wk]")) return;
    e.preventDefault();

    if (t.dataset.a) {
        addToCart(Number(t.dataset.a));
    }

    if (t.dataset.w) {
        const on = toggleWish(t.dataset.w);
        t.textContent = on ? "♥" : "♡";
        toast(on ? "Saved to wishlist" : "Removed from wishlist");
    }
});


