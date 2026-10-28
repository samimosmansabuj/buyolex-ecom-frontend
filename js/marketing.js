window.dataLayer = window.dataLayer || [];
window.__TRACKING_CONFIG__ = null;
window.__TRACKING_READY__ = new Promise((resolve) => {
    window.__resolveTrackingReady = resolve;
});

async function initTracking() {    try {
        const qs = new URLSearchParams();
        if (window.__CURRENT_PRODUCT_ID__) qs.set("product_id", window.__CURRENT_PRODUCT_ID__);
        if (window.__CURRENT_LANDING_CODE__) qs.set("landing_code", window.__CURRENT_LANDING_CODE__);
        const pid = qs.toString() ? `?${qs.toString()}` : "";
        const res = await fetch(`${window.API_BASE}/api/tracking-settings/${pid}`);
        const json = await res.json();
        if (!json.status) throw new Error(json.error || "Failed to load tracking settings");

        const data = json.data;
        window.__TRACKING_CONFIG__ = data;

        if (data.facebook_pixel && data.facebook_pixel.enabled && data.facebook_pixel.pixel_id) {
            injectFacebookPixel(data.facebook_pixel.pixel_id);
        }

        if (data.gtm && data.gtm.enabled && data.gtm.container_id) {
            injectGTM(data.gtm.container_id);
        }

        if (data.ga4 && data.ga4.enabled && data.ga4.measurement_id && !(data.gtm && data.gtm.enabled)) {
            injectGA4(data.ga4.measurement_id);
        }
    } catch (err) {
        console.error("[marketing.js] Failed to init tracking:", err);
        window.__TRACKING_CONFIG__ = {
            facebook_pixel: { enabled: false },
            facebook_capi: { enabled: false },
            gtm: { enabled: false },
            ga4: { enabled: false },
        };
    } finally {
        window.__resolveTrackingReady();
    }
}

if (!window.__DEFER_TRACKING_INIT__) {
    initTracking();
}
window.__runTracking = initTracking;
function injectFacebookPixel(pixelId) {
    !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', pixelId);
    fbq('track', 'PageView');
}

function injectGTM(containerId) {
    (function (w, d, s, l, i) {
        w[l] = w[l] || [];
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        var f = d.getElementsByTagName(s)[0],
            j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', containerId);

    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(noscript, document.body.firstChild);
}

function injectGA4(measurementId) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.gtag = window.gtag || function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', measurementId);
}

function logEventToBackend(eventName, payload) {
    try {
        fetch(`${window.API_BASE}/api/marketing/log-event/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_name: eventName, payload }),
        }).catch(() => {});
    } catch (e) {  }
}

function GAViewItemEvent(product) {
    if (!product) return;
    dataLayer.push({
        event: "view_item",
        ecommerce: {
            currency: "BDT",
            value: Number(product.discount_price),
            items: [
                {
                    item_id: String(product.id),
                    item_name: product.name,
                    price: Number(product.discount_price),
                    quantity: 1
                }
            ]
        }
    });

    if (window.__TRACKING_CONFIG__?.facebook_pixel?.enabled && window.fbq) {
        fbq('track', 'ViewContent', {
            content_ids: [String(product.id)],
            content_name: product.name,
            content_type: 'product',
            value: Number(product.discount_price),
            currency: 'BDT'
        });
    }

    logEventToBackend('view_item', { product_id: product.id, value: product.discount_price });
}

function GAAddToCartEvent(product) {
    if (!product) return;
    dataLayer.push({
        event: "add_to_cart",
        ecommerce: {
            currency: "BDT",
            value: Number(product.discount_price),
            items: [
                {
                    item_id: String(product.id),
                    item_name: product.name,
                    price: Number(product.discount_price),
                    quantity: 1
                }
            ]
        }
    });

    if (window.__TRACKING_CONFIG__?.facebook_pixel?.enabled && window.fbq) {
        fbq('track', 'AddToCart', {
            content_ids: [String(product.id)],
            content_name: product.name,
            content_type: 'product',
            value: Number(product.discount_price),
            currency: 'BDT'
        });
    }

    logEventToBackend('add_to_cart', { product_id: product.id, value: product.discount_price });
}

function GAInitiateCheckoutEvent(products, total) {
    if (!products || !products.length) return;
    dataLayer.push({
        event: "begin_checkout",
        ecommerce: {
            currency: "BDT",
            value: Number(total),
            items: products.map(product => ({
                item_id: String(product.id),
                item_name: product.name,
                price: Number(product.price),
                quantity: Number(product.quantity)
            }))
        }
    });

    if (window.__TRACKING_CONFIG__?.facebook_pixel?.enabled && window.fbq) {
        fbq('track', 'InitiateCheckout', {
            content_ids: products.map(p => String(p.id)),
            contents: products.map(p => ({ id: String(p.id), quantity: Number(p.quantity) })),
            content_type: 'product',
            value: Number(total),
            currency: 'BDT',
            num_items: products.length
        });
    }

    logEventToBackend('begin_checkout', { total, items: products.length });
}

function GAInitiatePurchaseEvent(products, total, orderId, customer) {
    if (!products || !products.length) return;
    const transactionId = orderId ? String(orderId) : Date.now().toString();

    customer = customer || {};
    const fullName = (customer.name || "").trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const userData = {
        email_address: customer.email || undefined,
        phone_number: customer.phone || undefined,
        address: {
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            street: customer.address || undefined,
            city: customer.district || undefined,
            country: "BD"
        }
    };

    dataLayer.push({
        event: "purchase",
        ecommerce: {
            transaction_id: transactionId,
            currency: "BDT",
            value: Number(total),
            items: products.map(product => ({
                item_id: String(product.id),
                item_name: product.name,
                price: Number(product.price),
                quantity: Number(product.quantity)
            }))
        },
        user_data: userData,
        customer_data: {
            name: fullName || undefined,
            phone: customer.phone || undefined,
            email: customer.email || undefined,
            address: customer.address || undefined,
            district: customer.district || undefined,
            order_id: transactionId
        }
    });

    if (window.__TRACKING_CONFIG__?.facebook_pixel?.enabled && window.fbq) {
        try {
            const pixelId = window.__TRACKING_CONFIG__.facebook_pixel.pixel_id;
            if (pixelId && (customer.phone || customer.email || fullName)) {
                fbq('init', pixelId, {
                    ph: customer.phone || undefined,
                    em: customer.email || undefined,
                    fn: firstName || undefined,
                    ln: lastName || undefined,
                    ct: customer.district || undefined,
                    country: "bd"
                });
            }
        } catch (e) {  }

        fbq('track', 'Purchase', {
            content_ids: products.map(p => String(p.id)),
            contents: products.map(p => ({ id: String(p.id), quantity: Number(p.quantity) })),
            content_type: 'product',
            value: Number(total),
            currency: 'BDT',
            num_items: products.length
        });
    }

    logEventToBackend('purchase', {
        order_id: transactionId,
        total,
        items: products.length,
        customer: {
            name: fullName || null,
            phone: customer.phone || null,
            email: customer.email || null,
            address: customer.address || null,
            district: customer.district || null
        }
    });
}


