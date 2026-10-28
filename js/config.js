const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const fmt = n => "৳" + Number(n).toLocaleString("en-US");

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const STORE = { cart: "bx-cart", wish: "bx-wish", theme: "bx-theme", session: "bx-session" };

function readStore(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {  }
}

function safeHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    doc.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button,textarea,select,base,svg,math,template").forEach(n => n.remove());
    doc.body.querySelectorAll("*").forEach(el => {
        [...el.attributes].forEach(a => {
            const name = a.name.toLowerCase(), val = a.value.trim();
            if (name.startsWith("on") || name === "srcdoc" || name === "formaction") return el.removeAttribute(a.name);
            if ((name === "href" || name === "src") && /^(javascript|vbscript|data):/i.test(val) && !(name === "src" && /^data:image\//i.test(val))) return el.removeAttribute(a.name);
            if (name === "style" && /expression\(|url\(|javascript:/i.test(val)) return el.removeAttribute(a.name);
        });
        if (el.tagName === "IMG") {
            const src = el.getAttribute("src") || "";
            if (src.startsWith("/")) el.setAttribute("src", Live.abs(src));
            el.setAttribute("loading", "lazy");
        }
        if (el.tagName === "A") { el.setAttribute("rel", "noopener noreferrer"); if (/^https?:/i.test(el.getAttribute("href") || "")) el.setAttribute("target", "_blank"); }
    });
    return doc.body.innerHTML;
}

function linkify(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
        if (node.parentElement.closest("a") || !/https?:\/\//i.test(node.nodeValue)) return;
        const frag = document.createDocumentFragment();
        node.nodeValue.split(/(https?:\/\/[^\s<]*[^\s<.,;:!?)\]])/i).forEach(part => {
            if (/^https?:\/\//i.test(part)) {
                const a = document.createElement("a");
                a.href = part; a.textContent = part; a.target = "_blank"; a.rel = "noopener noreferrer";
                frag.append(a);
            } else frag.append(part);
        });
        node.replaceWith(frag);
    });
}

function goTo(url) {
    window.location.href = url;
}

function productUrl(p) {
    return "product-details.html?slug=" + encodeURIComponent(p.slug);
}

function safeNext(raw, fallback = "profile.html") {
    if (typeof raw !== "string") return fallback;
    const value = raw.replace(/^\/+/, "");
    return /^[a-z0-9_\-]+(\.html)?(\?[a-z0-9_\-=&%.]*)?$/i.test(value) ? value : fallback;
}

function normalizePhone(value) {
    let p = String(value || "").replace(/[\s\-()]/g, "");
    if (p.startsWith("+88")) p = p.slice(3);
    else if (p.startsWith("88") && p.length === 13) p = p.slice(2);
    return p;
}

function isValidPhone(value) {
    return /^01[3-9]\d{8}$/.test(normalizePhone(value));
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
}

function getSession() {
    const s = readStore(STORE.session, null);
    return s && (s.phone || s.email) ? s : null;
}

function isLoggedIn() {
    return !!getSession();
}

function openPopup(id, html) {
    closePopup(id);
    const el = document.createElement("div");
    el.id = id;
    el.className = "pop-ov";
    el.innerHTML = `<div class="pop g" role="dialog" aria-modal="true">${html}</div>`;
    el.addEventListener("click", e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
    return el;
}

function closePopup(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function showLoginPopup(next, onLater) {
    const el = openPopup("loginPopup",
        `<div class="pop-ico">🔐</div><h3>Login required</h3><p class="mute">Please log in first to use this feature.</p>` +
        `<div class="btn-row" style="justify-content:center"><button type="button" class="ghost g" data-later>Later</button>` +
        `<a class="cta" href="login.html?next=${encodeURIComponent(next || "profile")}">Login now</a></div>`);
    el.querySelector("[data-later]").addEventListener("click", () => { el.remove(); if (onLater) onLater(); });
}

function requireLogin() {
    if (isLoggedIn()) return true;
    const here = location.pathname.replace(/^\/+/, "").replace(/\/+$/, "") || "profile";
    showLoginPopup(here + location.search, () => goTo("index.html"));
    return false;
}

function cartLineView(x) {
    const p = Live.productById(x.id);
    const slug = x.sl || (p && p.slug) || "";
    return {
        name: x.n || (p && p.name) || "Item", image: x.im || (p && p.image) || "", emoji: "🛍", colors: ["#1b8f8a", "#00383b"],
        price: Number(x.p) || 0, old: x.op || null, variant: x.v || "", stock: x.st, gone: !!x.gone,
        href: slug ? "product-details.html?slug=" + encodeURIComponent(slug) : "all_product.html"
    };
}

function thumbInner(v) {
    return v.image ? `<img src="${esc(v.image)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">` : esc(v.emoji || "📦");
}

function getCart() {
    const raw = readStore(STORE.cart, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(x => x && x.id && Number(x.q) > 0)
        .map(x => ({ ...x, id: Number(x.id), q: Math.min(99, Math.max(1, Math.floor(Number(x.q)))) }));
}

function saveCart(cart) {
    writeStore(STORE.cart, cart);
    updateCartCount();
    document.dispatchEvent(new CustomEvent("cart:changed"));
}

async function addToCart(id, qty = 1, variant = null) {
    const prod = Live.productById(id);
    if (!prod) { toast("Could not add this item"); return { status: false }; }
    if (prod.hasVariants && !variant) { goTo(productUrl(prod)); return { status: false }; }
    const r = await Live.cart.add(prod, variant && typeof variant === "object" ? variant : null, qty);
    toast(r.status ? "Added to cart" : r.message);
    if (r.status && typeof window.bxTrackAddToCart === "function") window.bxTrackAddToCart(prod, variant, qty);
    return r;
}

function cartCount() {
    return getCart().reduce((s, x) => s + x.q, 0);
}

function cartSubtotal(cart = getCart()) {
    return cart.reduce((s, x) => s + (Number(x.p) || 0) * x.q, 0);
}

function updateCartCount() {
    const n = cartCount();
    $$(".cart-count").forEach(el => { el.textContent = n; });
}

function getWish() {
    const raw = readStore(STORE.wish, []);
    return Array.isArray(raw) ? raw.map(Number) : [];
}

function isWished(id) {
    return getWish().includes(Number(id));
}

function toggleWish(id, prod, variant) {
    return Live.wish.toggle(id, prod, variant);
}

function updateWishCount() {
    const n = Object.keys(Live.wish.rows()).length;
    $$(".wish-count").forEach(el => { el.textContent = n; el.hidden = n === 0; });
}

function gradStyle(p) {
    return `background:linear-gradient(145deg,${p.colors[0]},${p.colors[1]})`;
}

function toast(text) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function formatDate(value) {
    try {
        return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) {
        return String(value || "");
    }
}

function formatDateTime(value) {
    try {
        return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
        return String(value || "");
    }
}

const ORDER_STATUS = {
    new: "Pending", follow_up: "Follow Up", confirmed: "Confirmed", shipped: "Shipped",
    delivered: "Delivered", cancelled: "Cancelled", returned: "Returned", refunded: "Refunded",
    hold: "On Hold", token_print: "Processing", ready_to_ship: "Ready to Ship", parcel_created: "Processing", return_processing: "Return in Progress"
};

function statusLabel(status) {
    return ORDER_STATUS[status] || String(status || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const PAYMENT_LABEL = { cod: "Cash on delivery", bkash: "bKash", nagad: "Nagad", online: "Online payment", partial: "Partial payment" };

function paymentLabel(type) {
    return PAYMENT_LABEL[type] || statusLabel(type);
}

const SELECT_OFF = "bx-cart-off";

function offKeys() {
    try { return new Set(JSON.parse(sessionStorage.getItem(SELECT_OFF) || "[]")); } catch (e) { return new Set(); }
}

function isSelected(line) {
    return !line.gone && !offKeys().has(Live.lineKey(line));
}

function setSelected(line, on) {
    const off = offKeys();
    if (on) off.delete(Live.lineKey(line)); else off.add(Live.lineKey(line));
    try { sessionStorage.setItem(SELECT_OFF, JSON.stringify([...off])); } catch (e) {  }
}

function selectedLines(cart = getCart()) {
    return cart.filter(isSelected);
}

function clearSelection() {
    try { sessionStorage.removeItem(SELECT_OFF); } catch (e) {  }
}

document.addEventListener("click", e => {
    const link = e.target.closest("[data-checkout]");
    if (link && !selectedLines().length) {
        e.preventDefault();
        toast("Select at least one product");
    }
});

(function () {
    "use strict";

    const base = () => String(window.API_BASE || "").replace(/\/+$/, "");
    const KEY = { access: "bx-access", refresh: "bx-refresh", wishRows: "bx-wish-rows", checkout: "bx-checkout" };

    const ls = {
        get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) {  } },
        del(k) { try { localStorage.removeItem(k); } catch (e) {  } }
    };
    const fail = message => ({ status: false, message });
    const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

    function abs(path) {
        if (!path) return "";
        const p = String(path);
        return /^(https?:)?\/\//i.test(p) || /^data:image\//i.test(p) ? p : base() + p;
    }

    function showPhone(p) {
        const s = String(p || "");
        return /^8801\d{9}$/.test(s) ? s.slice(2) : s;
    }

    const realName = (name, phone) => {
        const n = String(name || "").trim();
        const digits = n.replace(/\D/g, "");
        return n && !(digits && digits === String(phone || "").replace(/\D/g, "")) ? n : "";
    };

    const variantLabel = attrs => attrs && typeof attrs === "object" ? Object.values(attrs).join(" / ") : "";

    const tok = {
        access: () => ls.get(KEY.access),
        refresh: () => ls.get(KEY.refresh),
        set(a, r) { ls.set(KEY.access, a); if (r) ls.set(KEY.refresh, r); },
        clear() { ls.del(KEY.access); ls.del(KEY.refresh); }
    };
    const loggedIn = () => !!tok.access() && !!getSession();

    function errMsg(d, fallback) {
        if (!d || typeof d !== "object") return fallback;
        if (typeof d.message === "string" && d.message) return d.message;
        if (typeof d.detail === "string" && d.detail) return d.detail;
        for (const v of Object.values(d)) {
            const first = Array.isArray(v) ? v[0] : v;
            if (typeof first === "string" && first) return first;
        }
        return fallback;
    }

    async function http(path, { method = "GET", body, auth = true, query } = {}) {
        let url = base() + path;
        if (query) url += (url.includes("?") ? "&" : "?") + (typeof query === "string" ? query : new URLSearchParams(query).toString());
        const headers = {};
        if (body !== undefined) headers["Content-Type"] = "application/json";
        const access = tok.access();
        if (auth && access) headers.Authorization = "Bearer " + access;

        let res;
        try {
            res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
        } catch (e) {
            return { ok: false, status: 0, data: { status: false, message: "Could not reach the server. Check your connection and try again." } };
        }
        let data = null;
        try { data = await res.json(); } catch (e) { data = null; }
        if (res.status === 401 && auth && access) expireSession();
        return { ok: res.ok, status: res.status, data: data || {} };
    }

    function expireSession() {
        tok.clear();
        ls.del(STORE.session); ls.del(STORE.cart); ls.del(STORE.wish); ls.del(KEY.wishRows);
        clearSelection();
        if (typeof applyAuthState === "function") applyAuthState();
        if (typeof updateCartCount === "function") updateCartCount();
    }

    const PROD = new Map();
    const cacheProduct = p => { if (p && p.id != null) PROD.set(Number(p.id), p); return p; };
    const productById = id => PROD.get(Number(id)) || null;
    const productBySlug = slug => { for (const p of PROD.values()) if (p.slug === slug) return p; return null; };

    const lineKey = l => `${l.id}:${l.vid || 0}:${l.cn || ""}`;
    const cartLines = () => { const c = readStore(STORE.cart, []); return Array.isArray(c) ? c.filter(l => l && l.id && l.q > 0) : []; };
    const guestCartLines = () => (loggedIn() ? [] : cartLines());

    function makeLine(prod, variant, qty, note) {
        return {
            id: prod.id, vid: variant ? variant.id : null, q: qty, cn: note || "", v: variant ? variant.label : "", sl: prod.slug || "",
            n: prod.name, im: (variant && variant.image) || prod.image || (prod.images && prod.images[0]) || "",
            p: variant ? variant.price : prod.price, op: variant ? variant.oldPrice : (prod.oldPrice || null),
            st: variant ? variant.stock : prod.stock
        };
    }

    async function enrich(lines) {
        const ids = [...new Set(lines.map(l => l.id))];
        if (!ids.length) return lines;
        const r = await http("/cart/guest-refresh/", { auth: false, query: { ids: ids.join(",") } });
        if (!r.ok || !r.data.status) return lines;
        const byId = new Map((r.data.data || []).map(p => [p.id, p]));
        return lines.map(l => {
            const p = byId.get(l.id);
            if (!p) return { ...l, gone: true };
            const src = l.vid ? (p.variants || []).find(v => v.id === l.vid) : p;
            if (!src) return { ...l, gone: true };
            const price = num(src.discount_price) || num(src.price);
            const out = { ...l, p: price, op: num(src.discount_price) && num(src.price) > price ? num(src.price) : null, st: num(src.stock), gone: false };
            if (!out.im && p.image) out.im = abs(p.image);
            if (out.st > 0 && out.q > out.st) out.q = out.st;
            return out;
        });
    }

    async function fillSlugs(lines) {
        if (lines.every(l => l.sl)) return lines;
        if (typeof apiCatalog === "function") { try { await apiCatalog(); } catch (e) {  } }
        return lines.map(l => l.sl ? l : { ...l, sl: (productById(l.id) || {}).slug || "" });
    }

    async function syncCart() {
        if (loggedIn()) {
            const r = await http("/cart/");
            if (r.ok && r.data.status) {
                const lines = (r.data.data || []).map(i => {
                    const total = num(i.total), q = Math.max(1, num(i.quantity));
                    return {
                        id: i.product_id, vid: i.variant_id || null, q, v: variantLabel(i.variant), n: i.product,
                        im: abs(i.image), p: q ? total / q : num(i.price), op: null, cid: i.id, cn: i.customization_note || ""
                    };
                });
                saveCart(await fillSlugs(await enrich(lines)));
            }
        } else {
            const lines = cartLines();
            if (lines.length) saveCart((await enrich(lines)).filter(l => !l.gone));
        }
        return cartLines();
    }

    const cart = {
        lines: cartLines,
        key: lineKey,
        line: makeLine,

        async add(prod, variant, qty = 1, note = "") {
            qty = Math.max(1, Math.floor(num(qty)) || 1);
            const stock = variant ? variant.stock : prod.stock;
            if (prod.hasVariants && !variant) return fail("Please choose an option first");
            if (typeof stock === "number" && stock <= 0) return fail("Sorry, this item is out of stock");

            if (loggedIn()) {
                const body = { product_id: prod.id, variant_id: variant ? variant.id : null, quantity: qty };
                if (note) body.customization_note = note;
                const r = await http("/cart/add/", { method: "POST", body });
                if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not add this to your cart"));
                await syncCart();
                return { status: true };
            }
            const lines = cartLines();
            const next = makeLine(prod, variant, qty, note);
            const hit = lines.find(l => lineKey(l) === lineKey(next));
            if (hit) {
                hit.q = typeof stock === "number" && stock > 0 ? Math.min(hit.q + qty, stock) : hit.q + qty;
                hit.p = next.p; hit.op = next.op;
            } else {
                if (typeof stock === "number" && stock > 0) next.q = Math.min(next.q, stock);
                lines.push(next);
            }
            saveCart(lines);
            return { status: true };
        },

        async setQty(key, qty) {
            const lines = cartLines();
            const line = lines.find(l => lineKey(l) === key);
            if (!line) return fail("Item not found");
            qty = Math.floor(num(qty));
            if (qty <= 0) return cart.remove(key);
            if (typeof line.st === "number" && line.st > 0 && qty > line.st) { qty = line.st; }
            line.q = Math.min(99, qty);
            saveCart(lines);
            if (loggedIn() && line.cid) {
                const r = await http(`/cart/update/${line.cid}/`, { method: "POST", body: { quantity: line.q } });
                if (!r.ok || r.data.status === false) { await syncCart(); return fail(errMsg(r.data, "Could not update the quantity")); }
            }
            return { status: true };
        },

        async remove(key) {
            const lines = cartLines();
            const line = lines.find(l => lineKey(l) === key);
            if (!line) return { status: true };
            saveCart(lines.filter(l => l !== line));
            if (loggedIn() && line.cid) {
                const r = await http(`/cart/remove/${line.cid}/`, { method: "DELETE" });
                if (!r.ok || r.data.status === false) { await syncCart(); return fail(errMsg(r.data, "Could not remove this item")); }
            }
            return { status: true };
        },

        sync: syncCart
    };

    const wkey = (id, vid) => `${Number(id)}:${vid ? Number(vid) : 0}`;

    function wishRows() {
        const raw = readStore(KEY.wishRows, {});
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
        const rows = {};
        Object.entries(raw).forEach(([k, r]) => {
            const id = Number(r.id || k.split(":")[0]);
            rows[wkey(id, r.vid)] = { ...r, id };
        });
        return rows;
    }

    function saveWish(rows) {
        writeStore(STORE.wish, [...new Set(Object.values(rows).map(r => Number(r.id)))]);
        writeStore(KEY.wishRows, rows);
        document.dispatchEvent(new CustomEvent("wish:changed"));
        if (typeof updateWishCount === "function") updateWishCount();
    }

    async function syncWish() {
        if (!loggedIn()) return;
        const r = await http("/wishlist/");
        if (!r.ok || !r.data.status) return;
        const rows = {};
        (r.data.data || []).forEach(i => {
            const price = num(i.discount_price) || num(i.price);
            rows[wkey(i.product_id, i.variant_id)] = {
                wid: i.id, id: i.product_id, vid: i.variant_id || null, slug: i.slug, n: i.name, im: abs(i.image), p: price,
                op: num(i.discount_price) && num(i.price) > price ? num(i.price) : null, v: variantLabel(i.attributes)
            };
        });
        saveWish(rows);
    }

    async function serverRemove(row) {
        let wid = row.wid;
        if (!wid) {
            const r = await http("/wishlist/");
            const hit = r.ok && r.data.status && (r.data.data || []).find(i => i.product_id === row.id && (i.variant_id || null) === (row.vid || null));
            wid = hit ? hit.id : null;
        }
        if (wid) await http(`/wishlist/remove/${wid}/`, { method: "DELETE" });
    }

    function removeRows(keys) {
        const rows = wishRows();
        const gone = keys.map(k => rows[k]).filter(Boolean);
        keys.forEach(k => { delete rows[k]; });
        saveWish(rows);
        if (loggedIn() && gone.length) Promise.all(gone.map(serverRemove)).then(syncWish);
    }

    function addRow(prod, variant) {
        const p = prod || {};
        const rows = wishRows();
        rows[wkey(p.id, variant && variant.id)] = {
            wid: null, id: Number(p.id), vid: variant ? variant.id : null, slug: p.slug || "", n: p.name || "",
            im: (variant && variant.image) || p.image || (p.images && p.images[0]) || "",
            p: variant ? variant.price : (p.price || 0), op: variant ? variant.oldPrice : (p.oldPrice || null), v: variant ? variant.label || "" : ""
        };
        saveWish(rows);
        if (loggedIn()) {
            const body = { product_id: p.id };
            if (variant) body.variant_id = variant.id;
            http("/wishlist/add/", { method: "POST", body }).then(syncWish);
        }
    }

    const wish = {
        rows: wishRows,
        has: (id, vid) => !!wishRows()[wkey(id, vid)],
        remove: key => removeRows([key]),
        toggle(id, prod, variant) {
            id = Number(id);
            const rows = wishRows();
            const p = prod || productById(id) || { id };
            let on;
            if (variant === undefined) {
                const keys = Object.keys(rows).filter(k => rows[k].id === id);
                on = !keys.length;
                if (on) addRow(p, null); else removeRows(keys);
            } else {
                const key = wkey(id, variant && variant.id);
                on = !rows[key];
                if (on) addRow(p, variant); else removeRows([key]);
            }
            if (typeof window.bxTrackWish === "function") window.bxTrackWish(id, on);
            return on;
        },
        sync: syncWish
    };

    window.Live = {
        base, abs, num, fail, showPhone, realName, variantLabel, loggedIn, tok, http, errMsg, ls, KEY, expireSession,
        cacheProduct, productById, productBySlug, cart, wish, syncCart, syncWish, lineKey
    };

    window.addEventListener("DOMContentLoaded", () => {
        if (loggedIn()) { syncCart(); syncWish(); }
        else if (tok.access()) expireSession();
        else if (cartLines().length) syncCart();
    });
})();


