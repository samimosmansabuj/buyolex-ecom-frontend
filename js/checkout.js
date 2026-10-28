let appliedCoupon = null;
let checkoutSummary = { items: [], subtotal: 0, delivery_charge: 0 };

function checkoutLines() {
    if (new URLSearchParams(location.search).get("buy") === "1") {
        try {
            const one = JSON.parse(sessionStorage.getItem("bx-buy-now") || "null");
            if (one && one.id && one.q > 0) return [{ ...one, __buyNow: true }];
        } catch (e) {  }
    }
    return selectedLines();
}

function emptyCheckoutHtml() {
    return `<div class="done"><h1 style="font-size:44px">Your cart is empty</h1><p class="mute" style="margin:12px 0 24px">Add something you love and it will show up here.</p><a class="cta" href="all_product.html">Start shopping</a></div>`;
}

async function renderCheckout() {
    const root = $("#checkout-root");
    if (!root) return;

    if (!checkoutLines().length) { root.innerHTML = emptyCheckoutHtml(); return; }
    await loadDistricts();

    root.innerHTML =
        `<div class="cartw"><form class="panel g" id="co" novalidate><h2>Delivery Information</h2><div class="form">` +
        `<label class="full">Full name<input id="ckName" name="name" autocomplete="name" placeholder="Your full name"></label>` +
        `<label>Phone<input id="ckPhone" name="phone" type="tel" autocomplete="tel" placeholder="01XXXXXXXXX"></label>` +
        `<label class="full" id="savedWrap" hidden>Saved address<select id="ckSaved"><option value="">Choose a saved address</option></select></label>` +
        `<label class="full">Delivery address<input id="ckAddress" name="address" autocomplete="street-address" placeholder="House, road, area"></label>` +
        `<label class="full">District<select id="ckDistrict" name="district">${districtOptions()}</select></label>` +
        `<label class="full">Order note (optional)<textarea id="ckNote" name="note" maxlength="1000" rows="3" placeholder="Any special request, e.g. delivery time"></textarea></label>` +
        `</div>` +
        `<div class="delivery-box">Delivery Charge: <b id="deliveryChargeText">৳ 0</b></div>` +
        `<div class="lab" style="margin-top:22px">Payment</div>` +
        `<div class="pay" id="py"><button type="button" data-pay="cod" aria-pressed="true">Cash on delivery</button></div>` +
        `<p class="mute small" style="margin-top:12px;line-height:1.5">Pay in cash when your order arrives. We will call to confirm your order.</p>` +
        `</form>` +
        `<aside class="panel g sum"><h2 style="font-size:22px">Order summary</h2><div id="ckItems"></div>` +
        `<div class="coupon"><input id="ckCoupon" placeholder="Coupon code" autocomplete="off" aria-label="Coupon code"><button type="button" class="ghost g" id="couponBtn">Apply</button></div>` +
        `<div class="coupon-msg" id="couponMsg" role="status"></div>` +
        `<div class="r"><span>Subtotal</span><span id="ckSub"></span></div>` +
        `<div class="r" id="ckDiscRow" hidden><span>Coupon <b id="ckCode"></b></span><span id="ckDisc"></span></div>` +
        `<div class="r" id="ckAfterRow" hidden><span>Subtotal after discount</span><span id="ckAfter"></span></div>` +
        `<div class="r"><span>Delivery Charge</span><span id="ckShip"></span></div>` +
        `<div class="delivery-breakdown-wrap"><button type="button" class="delivery-breakdown-toggle" id="deliveryToggle" aria-expanded="false"><span>Delivery Charge Details</span><span id="deliveryArrow" aria-hidden="true">▼</span></button>` +
        `<div class="delivery-breakdown-list" id="deliveryBreakdown" hidden></div></div>` +
        `<div class="r tot"><span>Total</span><span id="ckTotal"></span></div>` +
        `<button type="submit" form="co" class="cta" id="placeBtn" style="width:100%;margin-top:18px">Place order</button>` +
        `<p class="mute small" style="margin:12px 0 0">Cash on Delivery available across Bangladesh</p></aside></div>`;

    bindCheckout();
    loadCheckoutSummary();
    prefillFromAccount();
}

async function loadCheckoutSummary() {
    const district = $("#ckDistrict") ? $("#ckDistrict").value : "";
    const r = await apiCheckoutSummary({ items: checkoutLines(), district });
    if (!r.status) { toast(r.message || "Checkout failed"); return; }
    checkoutSummary = r.data;

    $("#ckItems").innerHTML = checkoutSummary.items.map(i => {
        const variant = i.variant && typeof i.variant === "object" ? Object.values(i.variant).join(" / ") : "";
        return `<div class="ck-line"><div class="t" style="${gradStyle(i)};overflow:hidden">${thumbInner(i)}</div>` +
            `<span>${esc(i.product)}${variant ? ` <small class="mute">(${esc(variant)})</small>` : ""}${i.customization_note ? `<small class="line-note">✏️ ${esc(i.customization_note)}</small>` : ""}${i.is_gift ? ` <small class="gift-tag">🎁 Free gift</small>` : ""} × ${i.quantity}</span><b>${i.is_gift ? "FREE" : fmt(i.total)}</b></div>`;
    }).join("");

    const rows = checkoutSummary.items.filter(i => Number(i.delivery_charge) > 0);
    $("#deliveryBreakdown").innerHTML = rows.length
        ? rows.map(i => `<div class="delivery-item"><span>${esc(i.product)}</span><span>${fmt(i.delivery_charge)}</span></div>`).join("")
        : `<div class="delivery-item">No delivery charge</div>`;

    await revalidateCoupon();
    updateTotals();

    if (!loadCheckoutSummary.tracked && checkoutSummary.items.length) {
        loadCheckoutSummary.tracked = true;
        if (typeof window.bxTrackCheckout === "function") window.bxTrackCheckout(checkoutSummary.items, checkoutSummary.subtotal);
    }
}

function currentTotals() {
    const subtotal = Number(checkoutSummary.subtotal) || 0;
    const discount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
    const shipping = Number(checkoutSummary.delivery_charge) || 0;
    return { subtotal, discount, after: subtotal - discount, shipping, total: subtotal - discount + shipping };
}

function updateTotals() {
    const t = currentTotals();
    $("#ckSub").textContent = fmt(t.subtotal);
    $("#ckDiscRow").hidden = !t.discount;
    $("#ckAfterRow").hidden = !t.discount;
    if (t.discount) { $("#ckCode").textContent = appliedCoupon.code; $("#ckDisc").textContent = "− " + fmt(t.discount); $("#ckAfter").textContent = fmt(t.after); }
    $("#ckShip").textContent = fmt(t.shipping);
    $("#deliveryChargeText").textContent = "৳ " + t.shipping;
    $("#ckTotal").textContent = fmt(t.total);
    $("#placeBtn").textContent = "Place order · " + fmt(t.total);
}

function toggleDeliveryBreakdown() {
    const box = $("#deliveryBreakdown");
    box.hidden = !box.hidden;
    $("#deliveryArrow").textContent = box.hidden ? "▼" : "▲";
    $("#deliveryToggle").setAttribute("aria-expanded", String(!box.hidden));
}

function setCouponMessage(text, ok) {
    const el = $("#couponMsg");
    el.textContent = text || "";
    el.className = "coupon-msg" + (text ? (ok ? " ok" : " bad") : "");
}

function couponContext() {
    return { phone: ($("#ckPhone") || {}).value || "", lines: checkoutLines() };
}

async function revalidateCoupon() {
    if (!appliedCoupon) return;
    if (!isValidPhone($("#ckPhone").value)) return;
    const r = await apiValidateCoupon(appliedCoupon.code, Number(checkoutSummary.subtotal) || 0, couponContext());
    if (r.status) appliedCoupon.discount = r.discount;
    else { appliedCoupon = null; $("#ckCoupon").readOnly = false; $("#couponBtn").textContent = "Apply"; setCouponMessage(r.message, false); }
}

async function toggleCoupon() {
    const btn = $("#couponBtn");

    if (appliedCoupon) {
        appliedCoupon = null;
        $("#ckCoupon").value = "";
        $("#ckCoupon").readOnly = false;
        btn.textContent = "Apply";
        setCouponMessage("");
        return updateTotals();
    }

    btn.disabled = true;
    try {
        const r = await apiValidateCoupon($("#ckCoupon").value, Number(checkoutSummary.subtotal) || 0, couponContext());
        if (!r.status) return setCouponMessage(r.message, false);
        appliedCoupon = { code: r.code, discount: r.discount };
        $("#ckCoupon").value = r.code;
        $("#ckCoupon").readOnly = true;
        btn.textContent = "Remove";
        setCouponMessage(`Coupon ${r.code} applied: you save ${fmt(r.discount)}`, true);
        updateTotals();
    } finally {
        btn.disabled = false;
    }
}

async function prefillFromAccount() {
    if (!isLoggedIn()) return;

    const p = await apiGetProfile();
    if (p.status) {
        $("#ckName").value = p.data.name || "";
        $("#ckPhone").value = p.data.phone || "";
        $("#ckPhone").readOnly = !!p.data.phone;
    }

    const a = await apiListAddresses();
    if (a.status && a.data.length) {
        $("#savedWrap").hidden = false;
        $("#ckSaved").innerHTML = '<option value="">Choose a saved address</option>' +
            a.data.map(x => `<option value="${esc(x.id)}">${esc(x.name)} — ${esc(x.address)}, ${esc(x.district)}</option>`).join("");
        $("#ckSaved").addEventListener("change", e => {
            const chosen = a.data.find(x => x.id === e.target.value);
            if (!chosen) return;
            $("#ckAddress").value = chosen.address;
            $("#ckDistrict").value = chosen.district;
            clearFieldErrors();
            loadCheckoutSummary();
        });
    }
}

function showFieldError(input, message) {
    const label = input.closest("label");
    input.classList.add("bad");
    let el = label.querySelector(".err");
    if (!el) { el = document.createElement("span"); el.className = "err"; label.appendChild(el); }
    el.textContent = message;
}

function clearFieldErrors() {
    $$("#co .bad").forEach(i => i.classList.remove("bad"));
    $$("#co .err").forEach(e => e.remove());
}

function validateCheckoutForm() {
    clearFieldErrors();
    let firstBad = null;
    const fail = (input, msg) => { showFieldError(input, msg); firstBad = firstBad || input; };

    if (!$("#ckName").value.trim()) fail($("#ckName"), "Enter your full name");
    if (!isValidPhone($("#ckPhone").value)) fail($("#ckPhone"), "Enter a valid phone number (01XXXXXXXXX)");
    if ($("#ckAddress").value.trim().length < 6) fail($("#ckAddress"), "Enter your full delivery address");
    if (!$("#ckDistrict").value) fail($("#ckDistrict"), "Select your district");

    if (firstBad) firstBad.focus();
    return !firstBad;
}

let attemptTimer = null;

function saveOrderAttempt() {
    clearTimeout(attemptTimer);
    attemptTimer = setTimeout(() => {
        const phone = ($("#ckPhone") || {}).value.trim();
        if (!isValidPhone(phone) || !checkoutSummary.items.length) return;
        const a = typeof window.getAttributionData === "function" ? window.getAttributionData() : {};
        Live.checkout.attempt({
            customer: { name: $("#ckName").value.trim(), phone, address: $("#ckAddress").value.trim(), district: $("#ckDistrict").value },
            products: checkoutSummary.items.filter(i => !i.is_gift).map(i => ({ id: i.product_id, quantity: i.quantity })),
            source: "checkout", utm_source: a.utm_source, utm_medium: a.utm_medium, utm_campaign: a.utm_campaign
        });
    }, 700);
}

function orderFormValues() {
    return {
        name: $("#ckName").value, phone: $("#ckPhone").value,
        address: $("#ckAddress").value, district: $("#ckDistrict").value,
        addressId: $("#ckSaved") ? $("#ckSaved").value : ""
    };
}

async function placeOrder(e) {
    e.preventDefault();
    if (!validateCheckoutForm()) return;

    const btn = $("#placeBtn");
    btn.disabled = true;
    try {
        const payment = $("#py [aria-pressed=true]").dataset.pay;
        const lines = checkoutLines();
        const attribution = typeof window.getAttributionData === "function" ? window.getAttributionData() : {};
        const payload = { customer: orderFormValues(), payment, items: lines, coupon: appliedCoupon ? appliedCoupon.code : "", attribution, note: $("#ckNote").value.trim() };

        const r = await apiPlaceOrder(payload);

        if (r.otpRequired) {
            btn.disabled = false;
            return showOtpVerifyModal({
                phone: payload.customer.phone, message: r.message,
                submit: code => apiPlaceOrder({ ...payload, otp: code }),
                onSuccess: done => finishOrder(done, payload)
            });
        }
        if (!r.status) return toast(r.message);
        finishOrder(r, payload);
    } finally {
        btn.disabled = false;
    }
}

function finishOrder(r, payload) {
    sessionStorage.removeItem("bx-buy-now");
    clearSelection();
    const total = currentTotals().total;
    if (typeof window.bxTrackPurchase === "function") {
        window.bxTrackPurchase(checkoutSummary.items, checkoutSummary.subtotal, r.order_id, { name: payload.customer.name, phone: payload.customer.phone, address: payload.customer.address, district: payload.customer.district });
    }
    const s = getSession();
    if (s && !s.name && payload.customer.name) apiSaveProfile({ name: payload.customer.name }).catch(() => null);
    appliedCoupon = null;
    OrderBill.showSuccess({ order_id: r.order_id, total, bill: r.bill || null });
}

function bindCheckout() {
    $("#co").addEventListener("submit", placeOrder);
    $("#ckDistrict").addEventListener("change", () => { clearFieldErrors(); loadCheckoutSummary(); });
    $("#couponBtn").addEventListener("click", toggleCoupon);
    $("#deliveryToggle").addEventListener("click", toggleDeliveryBreakdown);
    $("#ckCoupon").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (!appliedCoupon) toggleCoupon(); } });
    ["#ckName", "#ckPhone", "#ckAddress"].forEach(sel => $(sel).addEventListener("blur", saveOrderAttempt));
    $("#ckDistrict").addEventListener("change", saveOrderAttempt);
    $("#co").addEventListener("input", e => { if (e.target.classList.contains("bad")) { e.target.classList.remove("bad"); const err = e.target.closest("label").querySelector(".err"); if (err) err.remove(); } });

    $$("#py button").forEach(b => b.addEventListener("click", () => {
        $$("#py button").forEach(x => x.setAttribute("aria-pressed", x === b));
    }));
}

document.addEventListener("DOMContentLoaded", renderCheckout);


