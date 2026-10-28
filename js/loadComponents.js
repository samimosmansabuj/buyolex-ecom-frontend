async function loadComponent(id, file) {
    const el = document.getElementById(id);

    if (!el) {
        console.warn("Missing container:", id);
        return;
    }

    try {
        const resp = await fetch(file, { cache: "no-cache" });
        if (!resp.ok) throw new Error(`Failed to fetch ${file}: ${resp.status}`);
        el.innerHTML = await resp.text();
    } catch (err) {
        console.error(`Error loading component "${id}" from "${file}":`, err);
        if (location.protocol === "file:") {
            console.error("Open the site through a local server (e.g. VS Code Live Server), not file://");
        }
    }
}

async function initComponents() {
    if (!document.getElementById("float-cart-container")) {
        const fc = document.createElement("div");
        fc.id = "float-cart-container";
        document.body.appendChild(fc);
    }
    await Promise.all([
        loadComponent("promo-container", "components/promo-bar.html"),
        loadComponent("topnavbar-container", "components/navbar.html"),
        loadComponent("footer-container", "components/footer.html"),
        loadComponent("toast-container", "components/toast.html"),
        loadComponent("drawer-container", "components/drawer.html"),
        loadComponent("cart-drawer-container", "components/cart-drawer.html"),
        loadComponent("mobile-bottom-nav-container", "components/mobile-bottom-nav.html"),
        loadComponent("float-wa-container", "components/float-wa.html"),
        loadComponent("float-cart-container", "components/float-cart.html")    ]);

    window.__componentsLoaded = true;
    document.dispatchEvent(new Event("components:loaded"));
}

document.addEventListener("DOMContentLoaded", initComponents);


