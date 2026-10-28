let ALL_ORDERS = [];

function orderCardHtml(order) {
    const items = order.items.map(item => {
        const variant = item.variant && typeof item.variant === "object" ? Object.values(item.variant).join(" / ") : "";
        return `<div class="order-item"><div class="oi-img" style="${gradStyle(item)};overflow:hidden">${thumbInner(item)}</div>` +
            `<div class="oi-info"><div class="oi-name">${esc(item.name)}${variant ? ` <span class="mute small">(${esc(variant)})</span>` : ""}</div>` +
            `<div class="oi-meta">Qty: ${item.qty}</div>${item.note ? `<div class="oi-note">✏️ ${esc(item.note)}</div>` : ""}</div></div>`;
    }).join("");

    return `<div class="order-card panel g" data-status="${esc(order.status)}">` +
        `<div class="order-top"><div><div class="order-id">Order #${esc(order.order_id)}</div>` +
        `<div class="order-date">Placed on ${esc(formatDate(order.date))}</div></div>` +
        `<span class="order-status ${esc(order.status)}">${esc(statusLabel(order.status))}</span></div>` +
        `<div class="order-items">${items}</div>` +
        `<div class="order-bottom"><div class="order-total">Total: ${fmt(order.total)}</div>` +
        `<a class="cta" href="order.html?id=${encodeURIComponent(order.order_id)}">View details →</a></div></div>`;
}

function renderOrders(status = "all") {
    const list = $("#ordersList");
    const shown = status === "all" ? ALL_ORDERS : ALL_ORDERS.filter(o => o.status === status);

    if (!ALL_ORDERS.length) {
        list.innerHTML = `<div class="done" style="padding:50px 0"><h2>No orders yet</h2><p class="mute" style="margin:8px 0 22px">When you place an order it will show up here.</p><a class="cta" href="all_product.html">Start shopping</a></div>`;
        return;
    }
    list.innerHTML = shown.length
        ? shown.map(orderCardHtml).join("")
        : `<div class="panel g" style="text-align:center"><p class="mute">No ${esc(statusLabel(status)).toLowerCase()} orders.</p></div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireLogin()) return;

    const list = $("#ordersList");
    list.innerHTML = `<p class="mute" style="text-align:center">Loading orders…</p>`;

    const r = await apiMyOrders();
    if (!r.status) { list.innerHTML = `<p class="mute" style="text-align:center">${esc(r.message)}</p>`; return; }

    ALL_ORDERS = r.data;
    renderOrders();

    $("#ordersFilter").addEventListener("click", e => {
        const btn = e.target.closest("[data-status]");
        if (!btn) return;
        $$("#ordersFilter .of-btn").forEach(b => b.classList.toggle("on", b === btn));
        renderOrders(btn.dataset.status);
    });
});


