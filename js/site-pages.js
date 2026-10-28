const PAGES_KEY = "bx-pages";

function hasText(html) {
    return !!new DOMParser().parseFromString(String(html || ""), "text/html").body.textContent.trim();
}

function richBlock(html) {
    const box = document.createElement("div");
    box.className = "rich";
    box.innerHTML = safeHtml(html);
    linkify(box);
    return box;
}

function whatsappLink(number) {
    const digits = String(number).replace(/\D/g, "");
    return "https://wa.me/" + (digits.startsWith("01") ? "88" + digits : digits);
}

function renderAbout(a) {
    const body = $("[data-page-body]");
    if (a.title && a.title.trim()) $("[data-page-title]").textContent = a.title.trim();
    if (hasText(a.description)) body.replaceChildren(richBlock(a.description));

    $$(".page-banner").forEach(el => el.remove());
    if (a.bg_image) {
        const banner = document.createElement("div");
        banner.className = "page-banner";
        const img = document.createElement("img");
        img.src = a.bg_image;
        img.alt = "";
        banner.append(img);
        body.before(banner);
    }
}

function renderContact(c) {
    const set = (key, fn) => { const el = $(`[data-contact="${key}"]`); if (el) fn(el); };
    if (c.location) set("location", el => { el.textContent = c.location; });
    if (c.email) set("email", el => { el.href = "mailto:" + c.email; el.textContent = c.email; });
    if (!c.phone) return;
    set("phone", el => {
        const links = [[c.phone, "tel:" + c.phone.replace(/\s+/g, "")]];
        if (c.secondary_phone) links.push([c.secondary_phone, "tel:" + c.secondary_phone.replace(/\s+/g, "")]);
        if (c.whatsapp) links.push(["WhatsApp " + c.whatsapp, whatsappLink(c.whatsapp)]);
        el.replaceChildren(...links.flatMap(([text, href], i) => {
            const a = document.createElement("a");
            a.href = href; a.textContent = text;
            if (href.startsWith("https:")) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
            return i ? [document.createElement("br"), a] : [a];
        }));
    });
}

function renderPolicy(p) {
    const lead = $("[data-page-lead]");
    if (p.short_description && p.short_description.trim()) lead.textContent = p.short_description.trim();
    if (hasText(p.description)) $("[data-page-body]").replaceChildren(richBlock(p.description));
}

function renderSitePage(kind, pages) {
    const page = pages && pages[kind];
    if (!page) return;
    if (kind === "about") renderAbout(page);
    else if (kind === "contact") renderContact(page);
    else renderPolicy(page);
}

(function () {
    const main = $("[data-site-page]");
    if (!main) return;
    const kind = main.dataset.sitePage;

    renderSitePage(kind, readStore(PAGES_KEY, null));
    apiSitePages().then(pages => {
        if (!pages) return;
        writeStore(PAGES_KEY, pages);
        renderSitePage(kind, pages);
    });
})();


