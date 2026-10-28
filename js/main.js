function isShopPage() {
    return /\/all_product(\.html)?$/.test(location.pathname);
}

function currentPath() {
    return location.pathname.replace(/\.html$/, "").replace(/^\/+|\/+$/g, "");
}

function currentNavKey() {
    const path = currentPath();
    if (path === "all_product") {
        const q = new URLSearchParams(location.search);
        return findCategory(q.get("category") || q.get("c")) ? "categories" : "shop:all";
    }
    return "";
}

function markActiveNav() {
    const key = currentNavKey();
    $$("#links [data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === key));

    const path = currentPath();
    const active = path === "" || path === "index" ? "home"
        : path === "wishlist" ? "wishlist"
        : path === "contact-us" ? "contact"
        : ["profile", "my-orders", "order", "address"].includes(path) ? "account"
        : path === "login" ? "login" : "";
    $$("#bottomNav [data-bn]").forEach(a => a.classList.toggle("on", a.dataset.bn === active));
}

function ensureAccountButton() {
    const nav = document.querySelector("nav.topnav");
    if (!nav) return;
    const current = document.getElementById("acctBtn");
    if (current && current.classList.contains("nav-acct")) return;

    nav.querySelectorAll("#acctMenu, .login-btn:not(.nav-user)").forEach(el => el.remove());
    const a = document.createElement("a");
    a.id = "acctBtn";
    a.className = "ib g nav-acct";
    a.href = "login.html";
    a.setAttribute("aria-label", "Login");
    a.title = "Login";
    a.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>';
    const theme = document.getElementById("theme");
    if (theme) theme.after(a); else nav.append(a);
}

function applyAuthState() {
    ensureAccountButton();
    const session = getSession();
    $$(".login-btn").forEach(el => { el.hidden = !!session; });
    $$(".account-btn").forEach(el => { el.hidden = !session; });

    const acct = document.getElementById("acctBtn");
    if (acct) {
        acct.href = session ? "profile.html" : "login.html";
        acct.setAttribute("aria-label", session ? "My profile" : "Login");
        acct.title = session ? "My profile" : "Login";
    }

    if (session) {
        const first = String(session.name || "Account").trim().split(/\s+/)[0].slice(0, 14) || "Account";
        const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
        set("sheetName", "Hi, " + first);
        set("sheetPhone", session.phone || session.email || "");
    }
}

async function logoutUser() {
    await apiLogout();
    toast("Logged out");
    setTimeout(() => goTo("index.html"), 500);
}

function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : !window.matchMedia("(prefers-color-scheme:light)").matches;
    const next = isDark ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem(STORE.theme, next); } catch (e) {  }
}

function bindSearch() {
    const input = $("#q");
    if (!input) return;

    const onShop = isShopPage();
    if (onShop) input.value = new URLSearchParams(location.search).get("q") || "";

    input.addEventListener("input", () => {
        if (onShop && typeof setShopParam === "function") setShopParam("q", input.value.trim());
    });

    input.addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (onShop) return;
        const v = input.value.trim();
        if (v && typeof window.bxTrackSearch === "function") window.bxTrackSearch(v);
        goTo("all_product.html" + (v ? "?q=" + encodeURIComponent(v) : ""));
    });
}

const DRAWERS = {
    menu: { drawer: "menuDrawer", overlay: "menuOverlay" },
    account: { drawer: "accountSheet", overlay: "menuOverlay" },
    cart: { drawer: "cartDrawer", overlay: "cartOverlay" }
};

function openDrawer(name) {
    const d = DRAWERS[name];
    const drawer = d && document.getElementById(d.drawer);
    if (!drawer) return false;

    closeDrawers();
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.getElementById(d.overlay).classList.add("open");
    document.body.classList.add("no-scroll");
    const closeBtn = drawer.querySelector("[data-close]");
    if (closeBtn) closeBtn.focus();
    return true;
}

function closeDrawers() {
    Object.values(DRAWERS).forEach(d => {
        const drawer = document.getElementById(d.drawer);
        const overlay = document.getElementById(d.overlay);
        if (drawer) { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); }
        if (overlay) overlay.classList.remove("open");
    });
    document.body.classList.remove("no-scroll");
}

function openCartDrawer() {
    if (typeof renderCartDrawer === "function") renderCartDrawer();
    if (!openDrawer("cart")) goTo("cart.html");
}

document.addEventListener("click", e => {
    const open = e.target.closest("[data-open]");
    if (open) { e.preventDefault(); openDrawer(open.dataset.open); return; }

    const close = e.target.closest("[data-close]");
    if (close) { closeDrawers(); return; }

    if (e.target.closest("#cartBtn, #floatCart")) { openCartDrawer(); return; }

    if (e.target.closest("#drawerTheme")) { toggleTheme(); return; }

    if (e.target.closest(".logout-btn")) { e.preventDefault(); closeDrawers(); logoutUser(); return; }

    if (e.target.closest(".drawer a")) closeDrawers();
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeDrawers();
});

function closeDropdowns(except) {
    $$(".dd.open").forEach(d => {
        if (d === except) return;
        d.classList.remove("open");
        const b = d.querySelector(".dd-btn");
        if (b) b.setAttribute("aria-expanded", "false");
    });
}

document.addEventListener("click", e => {
    const btn = e.target.closest(".dd-btn");
    if (btn) {
        const dd = btn.closest(".dd");
        const open = !dd.classList.contains("open");
        closeDropdowns();
        dd.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
        return;
    }
    if (!e.target.closest(".dd-panel") || e.target.closest(".dd-panel a, .dd-panel .logout-btn")) closeDropdowns();
});

document.addEventListener("keydown", e => { if (e.key === "Escape") closeDropdowns(); });

function buildCategoryMenus(tree) {
    const panel = document.getElementById("catPanel");
    if (panel) {
        panel.innerHTML = `<a class="dd-all" href="all_product.html">All products</a>` + tree.map(c =>
            `<div class="dd-group"><a class="dd-top" href="all_product.html?category=${Number(c.id)}">${esc(c.icon || "")} ${esc(c.name)}</a>` +
            (c.children || []).map(ch => `<a href="all_product.html?category=${Number(ch.id)}">${esc(ch.name)}</a>`).join("") + `</div>`).join("");
    }
    const drawer = document.getElementById("drawerCats");
    if (drawer) {
        drawer.innerHTML = tree.map(c =>
            `<a href="all_product.html?category=${Number(c.id)}">${esc(c.icon || "")} ${esc(c.name)}</a>` +
            (c.children || []).map(ch => `<a class="sub" href="all_product.html?category=${Number(ch.id)}">${esc(ch.name)}</a>`).join("")).join("");
    }
}

const LOADER_MIN_MS = 1100;

function hideLoader() {
    const el = document.getElementById("global-loader");
    if (!el || el.dataset.leaving) return;
    el.dataset.leaving = "1";
    setTimeout(() => {
        el.classList.add("hide");
        setTimeout(() => el.remove(), 600);
    }, Math.max(0, LOADER_MIN_MS - performance.now()));
}
setTimeout(hideLoader, 6000);

function makeDraggable(el, key) {
    if (!el) return;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));
    const place = (left, top) => {
        const r = el.getBoundingClientRect();
        el.style.left = clamp(left, 4, window.innerWidth - r.width - 4) + "px";
        el.style.top = clamp(top, 4, window.innerHeight - r.height - 4) + "px";
        el.style.right = "auto";
        el.style.bottom = "auto";
    };
    try { const s = JSON.parse(localStorage.getItem(key) || "null"); if (s) place(s.left, s.top); } catch (e) {  }

    let active = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    el.addEventListener("pointerdown", e => {
        if (e.button) return;
        active = true; moved = false; sx = e.clientX; sy = e.clientY;
        const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
        try { el.setPointerCapture(e.pointerId); } catch (err) {  }
    });
    el.addEventListener("pointermove", e => {
        if (!active) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        moved = true;
        place(ox + dx, oy + dy);
    });
    const end = () => {
        if (!active) return;
        active = false;
        if (moved) {
            const r = el.getBoundingClientRect();
            try { localStorage.setItem(key, JSON.stringify({ left: r.left, top: r.top })); } catch (err) {  }
        }
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    window.addEventListener("resize", () => { if (el.style.left) place(parseFloat(el.style.left), parseFloat(el.style.top)); });
}

function initLayout() {
    updateCartCount();
    updateWishCount();
    applyAuthState();
    markActiveNav();
    bindSearch();
    buildCategoryMenus(CATEGORY_TREE);
    apiCategoryTree().then(buildCategoryMenus);

    const themeBtn = $("#theme");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    const yr = $("#yr");
    if (yr) yr.textContent = new Date().getFullYear();

    makeDraggable($(".float-cart"), "bx-float-cart-pos");
    makeDraggable($(".float-wa"), "bx-float-wa-pos");

    hideLoader();
}

window.addEventListener("pageshow", () => { if (window.__componentsLoaded) { applyAuthState(); updateCartCount(); updateWishCount(); } });
window.addEventListener("storage", e => { if (e.key === STORE.session || e.key === STORE.cart || e.key === STORE.wish) { applyAuthState(); updateCartCount(); updateWishCount(); } });

if (window.__componentsLoaded) initLayout();
else document.addEventListener("components:loaded", initLayout);

document.addEventListener("cart:changed", () => {
    if (typeof renderCartDrawer === "function") renderCartDrawer();
});


