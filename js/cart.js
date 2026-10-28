function renderCart() {
    const root = $("#cart-root");
    if (!root) return;

    const cart = getCart();

    if (!cart.length) {
        root.innerHTML = `<div class="done"><h1 style="font-size:44px">Your cart is empty</h1><p class="mute" style="margin:12px 0 24px">Add something you love and it will show up here.</p><a class="cta" href="all_product.html">Start shopping</a></div>`;
        return;
    }

    const selected = selectedLines(cart);
    const count = selected.reduce((s, x) => s + x.q, 0);
    const sub = cartSubtotal(selected);
    const selectable = cart.filter(x => !x.gone);
    const allOn = selectable.length > 0 && selected.length === selectable.length;

    const lines = cart.map((x, i) => {
        const v = cartLineView(x);
        const note = v.gone ? `<br><span class="mute small" style="color:#ff8a8a">No longer available</span>`
            : (v.stock > 0 && v.stock <= 5 ? `<br><span class="mute small">Only ${v.stock} left</span>` : "");
        const custom = x.cn ? `<br><span class="line-note">✏️ ${esc(x.cn)}</span>` : "";
        return `<div class="line"><label class="sel"><input type="checkbox" data-sel="${i}"${isSelected(x) ? " checked" : ""}${v.gone ? " disabled" : ""} aria-label="Select ${esc(v.name)}"></label>` +
            `<a class="t" href="${esc(v.href)}" style="${gradStyle(v)}">${thumbInner(v)}</a>` +
            `<div class="i"><b>${esc(v.name)}</b><span>${fmt(v.price)} each${v.variant ? " · " + esc(v.variant) : ""}</span>${custom}${note}<br><button class="rm" data-r="${i}">Remove</button></div>` +
            `<div class="qty g"><button data-m="${i}" aria-label="Decrease">−</button><span>${x.q}</span><button data-p="${i}" aria-label="Increase">+</button></div>` +
            `<b style="min-width:70px;text-align:right">${fmt(v.price * x.q)}</b></div>`;
    }).join("");

    root.innerHTML =
        `<div class="cartw"><div class="panel g"><h2>Cart</h2>` +
        `<label class="sel-all"><input type="checkbox" data-sel-all${allOn ? " checked" : ""}> Select all</label>${lines}</div>` +
        `<aside class="panel g sum"><h2 style="font-size:22px">Summary</h2>` +
        `<div class="r"><span>Selected items</span><span>${count}</span></div>` +
        `<div class="r tot"><span>Subtotal</span><span>${fmt(sub)}</span></div>` +
        `<a class="cta" data-checkout style="display:block;text-align:center;margin-top:16px" href="checkout.html">Checkout</a></aside></div>`;
}

document.addEventListener("click", e => {
    const t = e.target.closest("[data-r],[data-m],[data-p]");
    if (!t) return;

    const x = getCart()[Number(t.dataset.r ?? t.dataset.m ?? t.dataset.p)];
    if (!x) return;
    const key = Live.lineKey(x);
    if (t.dataset.r !== undefined) Live.cart.remove(key);
    else if (t.dataset.m !== undefined) { if (x.q > 1) Live.cart.setQty(key, x.q - 1); }
    else if (x.st > 0 && x.q >= x.st) toast(`Only ${x.st} in stock`);
    else Live.cart.setQty(key, x.q + 1);
});

document.addEventListener("cart:changed", renderCart);
document.addEventListener("DOMContentLoaded", renderCart);

document.addEventListener("change", e => {
    const one = e.target.closest("[data-sel]");
    const all = e.target.closest("[data-sel-all]");
    if (!one && !all) return;
    const cart = getCart();
    if (one) setSelected(cart[Number(one.dataset.sel)], one.checked);
    else cart.filter(x => !x.gone).forEach(x => setSelected(x, all.checked));
    document.dispatchEvent(new CustomEvent("cart:changed"));
});


