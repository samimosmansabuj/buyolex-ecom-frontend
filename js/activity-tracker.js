(function () {
    const VISITOR_KEY = "bx_visitor_id";
    const ENDPOINT_EVENT = () => `${window.API_BASE}/api/tracking/event/`;
    const ENDPOINT_IDENTIFY = () => `${window.API_BASE}/api/tracking/identify/`;
    const FLUSH_INTERVAL_MS = 5000;
    const IMPORTANT_EVENTS = ["add_to_cart", "wishlist_add", "checkout_start", "order_placed", "login", "signup"];

    function uuidv4() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function getVisitorId() {
        let id = localStorage.getItem(VISITOR_KEY);
        if (!id) {
            id = uuidv4();
            localStorage.setItem(VISITOR_KEY, id);
        }
        return id;
    }

    let queue = [];

    function buildPayload() {
        const attribution = (typeof window.getAttributionData === "function") ? window.getAttributionData() : {};
        return {
            visitor_id: getVisitorId(),
            utm_source: attribution.utm_source || null,
            utm_medium: attribution.utm_medium || null,
            utm_campaign: attribution.utm_campaign || null,
            landing_url: attribution.landing_url || null,
            referrer: attribution.referrer || document.referrer || null,
            events: queue,
        };
    }

    function flush(useBeacon) {
        if (!queue.length) return;
        const payload = buildPayload();
        queue = [];

        try {
            if (useBeacon && navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
                navigator.sendBeacon(ENDPOINT_EVENT(), blob);
                return;
            }
        } catch (e) { }

        fetch(ENDPOINT_EVENT(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch(() => { });
    }

    setInterval(() => flush(false), FLUSH_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush(true);
    });
    window.addEventListener("pagehide", () => flush(true));

    window.trackEvent = function (eventType, meta) {
        meta = meta || {};
        queue.push({
            event_type: eventType,
            page_url: window.location.pathname + window.location.search,
            page_title: document.title || "",
            referrer: document.referrer || "",
            product_id: meta.product_id || null,
            variant_id: meta.variant_id || null,
            meta: meta,
        });
        if (IMPORTANT_EVENTS.includes(eventType)) flush(false);
    };

    window.identifyVisitor = function () {
        const token = (typeof getAccessToken === "function") ? getAccessToken() : localStorage.getItem("access");
        if (!token) return;
        fetch(ENDPOINT_IDENTIFY(), {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ visitor_id: getVisitorId() }),
        }).catch(() => {});
    };

    window.addEventListener("load", function () {
        window.trackEvent("page_view", {});

        if (window.__CURRENT_PRODUCT_ID__) {
            window.trackEvent("product_view", { product_id: window.__CURRENT_PRODUCT_ID__ });
        } else {
            let tries = 0;
            const poll = setInterval(() => {
                tries++;
                if (window.__CURRENT_PRODUCT_ID__) {
                    window.trackEvent("product_view", { product_id: window.__CURRENT_PRODUCT_ID__ });
                    clearInterval(poll);
                } else if (tries > 10) {
                    clearInterval(poll);
                }
            }, 300);
        }

        window.identifyVisitor();
    });
})();


