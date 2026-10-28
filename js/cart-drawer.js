function renderCartDrawer() {
    const body = document.getElementById("cartDrawerBody");
    const foot = document.getElementById("cartDrawerFoot");
    if (!body || !foot) return;

    const cart = getCart();

    if (!cart.length) {
        body.innerHTML = `<div class="drawer-empty"><em>🛒</em><b>Your cart is empty</b><p>Add something you love and it will show up here.</p><a class="cta" href="all_product.html">Start shopping</a></div>`;
        foot.hidden = true;
        return;
    }

    body.innerHTML = cart.map((x, i) => {
        const v = cartLineView(x);
        const custom = x.cn ? `<small class="line-note">✏️ ${esc(x.cn)}</small>` : "";
        return `<div class="dl"><label class="sel"><input type="checkbox" data-ds="${i}"${isSelected(x) ? " checked" : ""}${v.gone ? " disabled" : ""} aria-label="Select ${esc(v.name)}"></label><a class="t" href="${esc(v.href)}" style="${gradStyle(v)}">${thumbInner(v)}</a>` +
            `<div class="i"><b>${esc(v.name)}</b><span>${fmt(v.price)}${v.variant ? " · " + esc(v.variant) : ""}</span>${custom}` +
            `</div>` +
            `<div class="dr"><button type="button" class="rm-ico" data-dr="${i}" aria-label="Remove ${esc(v.name)}" title="Remove"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></svg></button>` +
            `<div class="qty g"><button type="button" data-dm="${i}" aria-label="Decrease">−</button><span>${x.q}</span><button type="button" data-dp="${i}" aria-label="Increase">+</button></div></div></div>`;
    }).join("");

    $("#cartDrawerSub").textContent = fmt(cartSubtotal(selectedLines(cart)));
    foot.hidden = false;
}

document.addEventListener("click", e => {
    const t = e.target.closest("[data-dr],[data-dm],[data-dp]");
    if (!t) return;

    const x = getCart()[Number(t.dataset.dr ?? t.dataset.dm ?? t.dataset.dp)];
    if (!x) return;
    const key = Live.lineKey(x);
    if (t.dataset.dr !== undefined) Live.cart.remove(key);
    else if (t.dataset.dm !== undefined) { if (x.q > 1) Live.cart.setQty(key, x.q - 1); }
    else if (x.st > 0 && x.q >= x.st) toast(`Only ${x.st} in stock`);
    else Live.cart.setQty(key, x.q + 1);
});

document.addEventListener("change", e => {
    const one = e.target.closest("[data-ds]");
    if (!one) return;
    setSelected(getCart()[Number(one.dataset.ds)], one.checked);
    document.dispatchEvent(new CustomEvent("cart:changed"));
});


