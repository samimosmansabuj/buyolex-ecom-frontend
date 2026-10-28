function renderOrder(order) {
    const items = order.items.map(item => {
        const variant = item.variant && typeof item.variant === "object"
            ? Object.entries(item.variant).map(([k, v]) => `<div class="oi-meta">${esc(k)}: ${esc(v)}</div>`).join("") : "";
        return `<div class="order-item"><div class="oi-img" style="${gradStyle(item)};overflow:hidden">${thumbInner(item)}</div>` +
            `<div class="oi-info"><div class="oi-name">${esc(item.name)}</div><div class="oi-meta">Qty: ${item.qty}</div>${variant}${item.note ? `<div class="oi-note">✏️ ${esc(item.note)}</div>` : ""}</div>` +
            `<div class="oi-price">${fmt(item.total)}</div></div>`;
    }).join("");

    $("#order-root").innerHTML =
        `<div class="order-header"><div><h1 class="page-title" style="margin:0">Order #${esc(order.order_id)}</h1>` +
        `<p class="mute small order-date" style="margin-top:6px">Placed on: ${esc(formatDateTime(order.date))}</p></div>` +
        `<span class="order-status ${esc(order.status)}">${esc(statusLabel(order.status))}</span></div>` +
        `<div class="order-grid"><div class="order-left">` +
        `<div class="panel g"><h2>Items</h2>${items}</div>` +
        `<div class="panel g"><h2>Delivery Information</h2>` +
        (order.customer_name ? `<p><b>Name:</b> ${esc(order.customer_name)}</p>` : "") +
        (order.customer_phone ? `<p><b>Phone:</b> ${esc(order.customer_phone)}</p>` : "") +
        `<p><b>Address:</b> ${esc(order.address || "-")}</p></div>` +
        `<div class="panel g"><h2>Payment</h2><p><b>Method:</b> ${esc(paymentLabel(order.payment_type))}</p>` +
        `<p><b>Status:</b> ${esc(statusLabel(order.payment_status))}</p></div></div>` +
        `<aside class="panel g sum"><h2>Order Summary</h2>` +
        `<div class="r"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>` +
        (order.discount ? `<div class="r"><span>Coupon${order.coupon ? " " + esc(order.coupon) : ""}</span><span>− ${fmt(order.discount)}</span></div>` : "") +
        `<div class="r"><span>Delivery Charge</span><span>${fmt(order.shipping)}</span></div>` +
        `<div class="r"><span>Total Items</span><span>${order.items.length}</span></div>` +
        `<div class="r tot"><span>Total</span><span>${fmt(order.total)}</span></div></aside></div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireLogin()) return;

    const root = $("#order-root");
    const id = new URLSearchParams(location.search).get("id");
    if (!id) { root.innerHTML = `<div class="panel g" style="text-align:center"><p>Order number is missing.</p></div>`; return; }

    const r = await apiGetOrder(id);
    if (!r.status) {
        root.innerHTML = `<div class="panel g" style="text-align:center"><p>${esc(r.message)}</p><a class="cta" style="margin-top:14px" href="my-orders.html">Back to my orders</a></div>`;
        return;
    }
    document.title = `Order ${r.data.order_id} — Buyolex`;
    renderOrder(r.data);
});


