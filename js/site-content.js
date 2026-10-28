function renderNavMenu(links) {
    $$(".nav-extra").forEach(el => el.remove());
    const bar = $("#links");
    const drawer = $("#drawerExtra");
    links.forEach(l => {
        const make = () => {
            const a = document.createElement("a");
            a.className = "nav-extra";
            a.href = safeHref(l.url);
            a.textContent = l.name;
            if (l.open_new_tab) { a.target = "_blank"; a.rel = "noopener"; }
            return a;
        };
        if (bar) bar.appendChild(make());
        if (drawer) drawer.appendChild(make());
    });
}

function renderFooterLinks(links) {
    const box = $("#footerLinks");
    if (!box || !links.length) return;
    box.textContent = "";
    links.forEach((l, i) => {
        if (i) box.append(" · ");
        const a = document.createElement("a");
        a.href = safeHref(l.url);
        a.textContent = l.name;
        box.appendChild(a);
    });
}

function renderSocialLinks(links) {
    const box = $("#footerSocial");
    if (!box) return;
    box.textContent = "";
    links.forEach(l => {
        const a = document.createElement("a");
        a.className = "soc";
        a.href = safeHref(l.url);
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = l.name;
        a.setAttribute("aria-label", l.name);
        box.appendChild(a);
    });
}

function renderNewsFeed(items) {
    const old = document.getElementById("newsTicker");
    if (old) old.remove();
    if (!items.length) return;

    const track = document.createElement("div");
    track.className = "news-feed-track";
    [0, 1].forEach(copy => items.forEach(n => {
        const el = document.createElement(n.url ? "a" : "span");
        if (n.url) el.href = safeHref(n.url);
        el.textContent = n.text;
        if (copy) el.setAttribute("aria-hidden", "true");
        track.appendChild(el);
        const sep = document.createElement("span");
        sep.className = "news-feed-sep";
        sep.textContent = "•";
        sep.setAttribute("aria-hidden", "true");
        track.appendChild(sep);
    }));

    const bar = document.createElement("div");
    bar.className = "news-feed-ticker";
    bar.id = "newsTicker";
    bar.appendChild(track);
    document.body.insertBefore(bar, document.getElementById("promo-container"));
}

function applyBrand(b) {
    if (!b) return;
    const name = String(b.name || "").trim();
    if (name) {
        $$("[data-brand-name]").forEach(el => { el.textContent = name; });
        if (!document.title.includes(name)) document.title = document.title.replace("Buyolex", name);
        const logo = $("#logo");
        if (logo) logo.setAttribute("aria-label", name + " home");
    }
    if (name || b.logo) $$(".brand-mark").forEach(el => el.setAttribute("hidden", ""));
    if (b.logo) {
        $$("[data-brand-logo]").forEach(img => { img.src = b.logo; img.alt = name; img.hidden = false; });
        document.documentElement.style.setProperty("--loader-logo", `url("${b.logo.replace(/"/g, "%22")}")`);
        document.documentElement.classList.add("has-logo");
    }
    const link = (sel, href, text) => $$(sel).forEach(a => { a.href = href; a.textContent = text; });
    if (b.phone) link("[data-brand-phone]", "tel:" + b.phone.replace(/\s+/g, ""), b.phone);
    if (b.email) link("[data-brand-email]", "mailto:" + b.email, b.email);
    if (b.website) link("[data-brand-site]", safeHref(/^https?:/i.test(b.website) ? b.website : "https://" + b.website), b.website.replace(/^https?:\/\//i, ""));
}

async function loadSiteContent() {
    applyBrand(readStore("bx-brand", null));
    const data = await apiSiteContent();
    if (!data) return;
    if (data.brand) {
        writeStore("bx-brand", data.brand);
        applyBrand(data.brand);
    }
    renderNavMenu(data.nav_menu || []);
    renderFooterLinks(data.footer_links || []);
    renderSocialLinks(data.social_links || []);
    renderNewsFeed(data.news_feed || []);
}

if (window.__componentsLoaded) loadSiteContent();
else document.addEventListener("components:loaded", loadSiteContent);


