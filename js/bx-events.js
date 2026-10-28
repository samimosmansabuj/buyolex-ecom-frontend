(function () {
    "use strict";

    const track = (type, meta) => { try { if (typeof window.trackEvent === "function") window.trackEvent(type, meta || {}); } catch (e) {  } };
    const ga = (fn, ...args) => { try { if (typeof window[fn] === "function") window[fn](...args); } catch (e) {  } };

    const asGa = (p, price) => ({ id: p.id, name: p.name, discount_price: price });

    window.getAccessToken = () => (window.Live ? Live.tok.access() : "");

    window.bxTrackViewItem = p => {
        ga("GAViewItemEvent", asGa(p, p.price));
        track("product_view", { product_id: p.id });
    };

    window.bxTrackAddToCart = (p, variant, qty) => {
        ga("GAAddToCartEvent", asGa(p, variant ? variant.price : p.price));
        track("add_to_cart", { product_id: p.id, variant_id: variant ? variant.id : null, quantity: qty || 1 });
    };

    window.bxTrackWish = (id, on) => track(on ? "wishlist_add" : "wishlist_remove", { product_id: id });

    window.bxTrackCheckout = (items, total) => {
        ga("GAInitiateCheckoutEvent", items.map(i => ({ id: i.product_id, name: i.product, price: i.quantity ? i.total / i.quantity : 0, quantity: i.quantity })), total);
        track("checkout_start", { item_count: items.length, total });
    };

    window.bxTrackPurchase = (items, total, orderId, customer) => {
        ga("GAInitiatePurchaseEvent",
            items.map(i => ({ id: i.product_id, name: i.product, price: i.quantity ? i.total / i.quantity : 0, quantity: i.quantity })),
            total, orderId, customer);
        track("order_placed", { order_id: orderId, total, item_count: items.length });
    };

    window.bxTrackSearch = query => track("search", { query });

    window.bxIdentify = () => {
        track("login", {});
        try { if (typeof window.identifyVisitor === "function") window.identifyVisitor(); } catch (e) {  }
    };
})();


