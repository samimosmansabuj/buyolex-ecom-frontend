(function () {
    const money = v => {
        const n = Number(v || 0);
        return "৳" + (Number.isInteger(n) ? n : n.toFixed(2)).toLocaleString("en-US");
    };
    const safeColor = (v, fallback) => (/^#[0-9a-fA-F]{3,8}$/.test(String(v || "")) ? v : fallback);
    const safeUrl = v => (/^https?:\/\//i.test(String(v || "")) ? v : "");

    function html(bill) {
        if (!bill || !Array.isArray(bill.items) || !bill.items.length) return "";

        const brand = bill.brand || {};
        const colors = bill.colors || {};
        const headBg = safeColor(colors.header_bg, "#1c2b39");
        const headTx = safeColor(colors.header_text, "#ffffff");
        const hi = safeColor(colors.highlight, "#f5f5f5");
        const logo = safeUrl(brand.logo);
        const cust = bill.customer || {};

        const rows = bill.items.map(it => `
            <tr>
                <td>${esc(it.name)}${it.variant ? `<span class="bx-bill-var">${esc(it.variant)}</span>` : ""}</td>
                <td class="c">${esc(it.quantity)}</td>
                <td class="r">${it.is_free ? "ফ্রি" : money(it.line_total)}</td>
            </tr>`).join("");

        const addr = [cust.address, cust.district].filter(Boolean).join(", ");
        const contact = [brand.phone, brand.website].filter(Boolean).join("  •  ");

        return `
        <div class="bx-bill">
            <div class="bx-bill-wm">${logo ? `<img src="${esc(logo)}" alt="">` : `<span>${esc(brand.name)}</span>`}</div>
            <div class="bx-bill-in">
                <div class="bx-bill-head" style="background:${headBg};color:${headTx};">
                    ${logo ? `<img class="bx-bill-logo" src="${esc(logo)}" alt="">` : ""}
                    <div>
                        <div class="bx-bill-brand">${esc(brand.name)}</div>
                        ${contact ? `<div class="bx-bill-sub">${esc(contact)}</div>` : ""}
                    </div>
                </div>
                <div class="bx-bill-ok">✔ আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে</div>
                <div class="bx-bill-body">
                    <div class="bx-bill-meta">
                        <div>অর্ডার নং: <b>${esc(bill.order_id)}</b></div>
                        <div>${esc(bill.date)}</div>
                    </div>
                    <div class="bx-bill-cust">
                        <div><b>${esc(cust.name)}</b>${cust.phone ? ` &nbsp;|&nbsp; ${esc(cust.phone)}` : ""}</div>
                        ${addr ? `<div class="bx-bill-addr">${esc(addr)}</div>` : ""}
                    </div>
                    <table class="bx-bill-tbl">
                        <thead><tr><th>পণ্য</th><th class="c">পরিমাণ</th><th class="r">মূল্য</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <div class="bx-bill-row"><span>সাবটোটাল</span><span>${money(bill.subtotal)}</span></div>
                    <div class="bx-bill-row"><span>ডেলিভারি চার্জ</span><span>${Number(bill.delivery) > 0 ? money(bill.delivery) : "ফ্রি"}</span></div>
                    ${Number(bill.discount) > 0 ? `<div class="bx-bill-row bx-bill-disc"><span>ডিসকাউন্ট</span><span>-${money(bill.discount)}</span></div>` : ""}
                    <div class="bx-bill-total" style="background:${hi};">
                        <span>সর্বমোট</span><span>${money(bill.total)}</span>
                    </div>
                    <div class="bx-bill-pay">পেমেন্ট: ${esc(bill.payment_type || "Cash on Delivery")}</div>
                </div>
                <div class="bx-bill-foot">ধন্যবাদ, ${esc(brand.name)}-এর সাথে থাকার জন্য!</div>
            </div>
        </div>`;
    }

    let timer = null;

    function countdown(seconds, target, id) {
        let left = seconds;
        timer = setInterval(() => {
            left -= 1;
            const el = document.getElementById(id);
            if (el) el.textContent = Math.max(left, 0);
            if (left <= 0) { clearInterval(timer); goTo(target); }
        }, 1000);
    }

    function actionsHtml(orderId, extraStyle) {
        const second = !isLoggedIn()
            ? `<a class="ghost g" href="login.html?next=my-orders">Log in to track orders</a>`
            : orderId ? `<a class="ghost g" href="order.html?id=${encodeURIComponent(orderId)}">View order</a>` : "";
        return `<div class="btn-row" style="justify-content:center;${extraStyle}"><a class="cta" href="all_product.html">Continue shopping</a>${second}</div>`;
    }

    function showSuccess(info) {
        if (document.getElementById("orderSuccessModal")) return;
        try { sessionStorage.setItem("bx-last-order", JSON.stringify(info)); } catch (e) {  }

        const billHtml = html(info.bill);
        const seconds = billHtml ? 15 : 4;

        const overlay = document.createElement("div");
        overlay.id = "orderSuccessModal";
        overlay.className = "os-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Order placed successfully");
        overlay.innerHTML =
            `<div class="os-modal">` +
            (billHtml
                ? billHtml
                : `<div class="os-card g"><div class="ck">✓</div><h2>Order Placed Successfully</h2>` +
                  `<p class="mute">Order ${esc(info.order_id)} — thank you! We have received your order and will contact you soon.</p></div>`) +
            `<div class="bill-count">Redirecting in <b id="osCount">${seconds}</b> seconds...</div>` +
            actionsHtml(info.order_id, "margin-top:10px") + `</div>`;

        document.body.appendChild(overlay);
        document.body.classList.add("no-scroll");
        overlay.scrollTop = 0;
        countdown(seconds, isLoggedIn() ? "my-orders.html" : "index.html", "osCount");
    }

    document.addEventListener("DOMContentLoaded", () => {
        const root = document.getElementById("done-root");
        if (!root) return;

        const order = new URLSearchParams(location.search).get("order") || "";
        const valid = /^BX-\d{6}$/.test(order);

        let last = null;
        try { last = JSON.parse(sessionStorage.getItem("bx-last-order") || "null"); } catch (e) {  }
        const info = valid && last && last.order_id === order ? last : null;
        const billHtml = info ? html(info.bill) : "";
        const seconds = billHtml ? 15 : 3;

        root.innerHTML = (billHtml
            ? `<div class="bill-wrap">${billHtml}</div>`
            : `<div class="done" style="padding-bottom:10px"><div class="ck">✓</div><h1 style="font-size:40px">Order Placed Successfully</h1>` +
              `<p class="mute" style="margin:12px 0 0">${valid ? `Order ${esc(order)} — ` : ""}Thank you for your order. We have received it and will contact you soon.</p></div>`) +
            `<div class="bill-count">Redirecting in <b id="orderRedirectCountdown">${seconds}</b> seconds...</div>` +
            actionsHtml(valid ? order : "", "");
        countdown(seconds, isLoggedIn() ? "my-orders.html" : "index.html", "orderRedirectCountdown");
    });

    window.OrderBill = { html, showSuccess };
})();


