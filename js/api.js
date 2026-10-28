const fail = message => ({ status: false, message });

async function apiPhoneCheck(phoneRaw) {
    const phone = normalizePhone(phoneRaw);
    return isValidPhone(phone) ? Live.auth.phoneCheck(phone) : fail("Enter a valid Bangladeshi mobile number");
}

async function apiRegister({ phone: phoneRaw, name, password }) {
    const phone = normalizePhone(phoneRaw);
    if (!isValidPhone(phone)) return fail("Enter a valid Bangladeshi mobile number");
    if (String(password || "").length < 6) return fail("Password must be at least 6 characters");
    return Live.auth.register({ phone, name, password });
}

async function apiLogin({ phone: phoneRaw, password }) {
    const phone = normalizePhone(phoneRaw);
    if (!isValidPhone(phone)) return fail("Enter a valid Bangladeshi mobile number");
    if (!password) return fail("Enter your password");
    return Live.auth.login({ phone, password });
}

const apiGoogleLogin = credential => Live.auth.google(credential);
const apiLogout = () => Live.auth.logout();

async function apiSendOtp(phoneRaw) {
    const phone = normalizePhone(phoneRaw);
    return isValidPhone(phone) ? Live.auth.sendOtp(phone) : fail("Enter a valid Bangladeshi mobile number");
}

const apiVerifyOtp = (phoneRaw, otp) => Live.auth.verifyOtp(normalizePhone(phoneRaw), String(otp || "").trim());

async function apiResetPassword({ phone: phoneRaw, otp, password }) {
    if (String(password || "").length < 6) return fail("Password must be at least 6 characters");
    return Live.auth.resetPassword({ phone: normalizePhone(phoneRaw), otp: String(otp || "").trim(), password });
}

const apiGetProfile = () => Live.auth.getProfile();

async function apiSaveProfile({ name, whatsapp }) {
    name = String(name || "").trim();
    if (!name) return fail("Enter your name");
    if (name.length > 60) return fail("Name is too long");
    return Live.auth.saveProfile({ name, whatsapp: whatsapp ? normalizePhone(whatsapp) : "" });
}

const apiListAddresses = () => Live.addresses.list();

async function apiSaveAddress({ id, name, phone, district, address }) {
    name = String(name || "").trim();
    address = String(address || "").trim();
    phone = normalizePhone(phone);
    if (!name) return fail("Enter the recipient name");
    if (!isValidPhone(phone)) return fail("Enter a valid Bangladeshi mobile number");
    if (!district) return fail("Select a district");
    if (address.length < 5) return fail("Enter the full address");
    return Live.addresses.save({ id, name, phone, district, address });
}

const apiDeleteAddress = id => Live.addresses.remove(id);

async function apiValidateCoupon(codeRaw, subtotal, ctx = {}) {
    const code = String(codeRaw || "").trim().toUpperCase();
    if (!code) return fail("Enter a coupon code");
    if (!isValidPhone(ctx.phone || "")) return fail("Enter your phone number first so we can check the coupon");
    return Live.checkout.coupon({ code, phone: ctx.phone, lines: ctx.lines || [] });
}

const apiCheckoutSummary = ({ items, district }) => Live.checkout.summary({ lines: items, district });

async function apiPlaceOrder({ customer, items, coupon, attribution, otp, note }) {
    const c = customer || {};
    const name = String(c.name || "").trim();
    const address = String(c.address || "").trim();
    const phone = normalizePhone(c.phone);
    if (!name) return fail("Enter your name");
    if (!isValidPhone(phone)) return fail("Enter a valid Bangladeshi mobile number");
    if (!c.district) return fail("Select your district");
    if (address.length < 5) return fail("Enter your full address");
    return Live.checkout.place({ customer: { name, phone, address, district: c.district, addressId: c.addressId }, lines: items, coupon, attribution, otp, note });
}

const apiMyOrders = () => Live.orders.list();
const apiGetOrder = id => Live.orders.get(id);

async function apiSendContact({ name, email, phone, subject, message }) {
    if (!String(name || "").trim()) return fail("Enter your name");
    if (!isValidEmail(email)) return fail("Enter a valid email address");
    if (phone && !isValidPhone(phone)) return fail("Enter a valid phone number");
    if (!subject) return fail("Select a subject");
    if (String(message || "").trim().length < 10) return fail("Please write at least 10 characters");
    return { status: true };
}

const apiBase = () => String(window.API_BASE || "").replace(/\/+$/, "");

function resolveAssetUrl(path) {
    if (!path) return "";
    const p = String(path);
    if (/^(https?:)?\/\//i.test(p) || /^data:image\//i.test(p)) return p;
    return apiBase() + p;
}

function safeHref(url) {
    const u = String(url || "").trim();
    return !u || /^(javascript|data|vbscript):/i.test(u) ? "#" : u;
}

async function contentGet(path) {
    const res = await fetch(apiBase() + path);
    return res.json();
}

let _pages = null, _siteContent = null, _slides = null, _showcase = null, _categoryTree = null, _catalog = null;

function apiSiteContent() {
    if (!_siteContent) {
        _siteContent = contentGet("/api/ecom/site-content/")
            .then(j => (j && j.status ? j.data || {} : null))
            .catch(() => null);
    }
    return _siteContent;
}

function apiSitePages() {
    if (!_pages) {
        _pages = contentGet("/api/ecom/pages/")
            .then(j => (j && j.status ? j.data || null : null))
            .catch(() => null);
    }
    return _pages;
}

function apiHomeSlider() {
    if (!_slides) {
        _slides = contentGet("/api/ecom/home-slider/")
            .then(j => (j && j.status && Array.isArray(j.data) ? j.data : []))
            .catch(() => []);
    }
    return _slides;
}

function apiShowcaseMedia() {
    if (!_showcase) {
        _showcase = contentGet("/api/ecom/showcase-media/")
            .then(j => (j && j.status && Array.isArray(j.data) ? j.data : []))
            .catch(() => []);
    }
    return _showcase;
}

let CATEGORY_TREE = [];

function flattenCategories(tree = CATEGORY_TREE, out = []) {
    tree.forEach(c => { out.push(c); flattenCategories(c.children || [], out); });
    return out;
}

function findCategory(ref) {
    if (ref === null || ref === undefined || ref === "") return null;
    const all = flattenCategories();
    return all.find(c => String(c.id) === String(ref))
        || all.find(c => c.name.toLowerCase() === String(ref).toLowerCase())
        || null;
}

function categoryIdsWithChildren(cat) {
    return [cat.id].concat(...(cat.children || []).map(categoryIdsWithChildren));
}

function apiCategoryTree() {
    if (!_categoryTree) {
        _categoryTree = contentGet("/api/ecom/categories/")
            .then(j => {
                if (j && j.status && Array.isArray(j.data)) CATEGORY_TREE = j.data;
                return CATEGORY_TREE;
            })
            .catch(() => CATEGORY_TREE);
    }
    return _categoryTree;
}

const normalizeApiProduct = p => Live.normList(p);

function apiCatalog() {
    if (!_catalog) {
        _catalog = contentGet("/api/ecom/products/?sort=last_update&page_size=500")
            .then(j => (j && j.results && Array.isArray(j.results.data) ? j.results.data : []))
            .then(list => list.map(normalizeApiProduct))
            .catch(() => []);
    }
    return _catalog;
}

(function () {
    "use strict";

    const { base, abs, num, fail, showPhone, realName, variantLabel, loggedIn, tok, http, errMsg, ls, KEY, expireSession,
            cacheProduct, productById, syncCart, syncWish, lineKey } = Live;
    const cartLines = Live.cart.lines;

    function normList(p) {
        const price = num(p.discount_price) || num(p.price);
        const original = num(p.discount_price) ? num(p.price) : 0;
        const cat = p.category && typeof p.category === "object" ? p.category : {};
        return cacheProduct({
            id: p.id, slug: p.slug, name: String(p.name || ""), category: cat.name || "", categoryId: cat.id || null,
            price, oldPrice: original > price ? original : null, rating: null,
            image: abs(p.image), emoji: "", colors: ["#1b8f8a", "#00383b"], tag: "", description: "", specs: {},
            hasVariants: !!p.has_variants, fromApi: true
        });
    }

    async function productDetail(slug) {
        const r = await http(`/api/ecom/products/${encodeURIComponent(slug)}/`, { auth: false });
        if (!r.ok || !r.data.status || !r.data.data) return null;
        const d = r.data.data;
        const variants = (d.variants || []).map(v => {
            const price = num(v.discount_price) || num(v.price);
            return {
                id: v.id, attributes: v.attributes || {}, label: variantLabel(v.attributes),
                price, oldPrice: num(v.discount_price) && num(v.price) > price ? num(v.price) : null,
                stock: num(v.stock), image: abs(v.image), images: (v.images || []).map(abs).filter(Boolean), isDefault: !!v.is_default
            };
        });
        const price = num(d.discount_price) || num(d.price);
        const product = {
            id: d.id, slug: d.slug, name: String(d.name || ""),
            price, oldPrice: num(d.discount_price) && num(d.price) > price ? num(d.price) : null,
            stock: num(d.stock), shortDescription: d.short_description || "", descriptionHtml: d.description || "",
            images: (d.images || []).map(abs), variants, hasVariants: variants.length > 0,
            defaultVariantId: d.default_variant_id || null,
            features: d.features || [], faqs: d.faqs || [], reviews: d.reviews || [],
            rating: num(d.rating), reviewCount: num(d.review_count), soldCount: num(d.sold_count),
            isBestseller: !!d.is_bestseller,
            hasCustomization: !!d.has_customization, customizationFields: d.customization_fields || [],
            customizationPlaceholder: d.customization_placeholder || "", gifts: d.gift_product || [], image: abs((d.images || [])[0]), fromApi: true,
            emoji: "", colors: ["#1b8f8a", "#00383b"]
        };
        const known = productById(product.id);
        cacheProduct({ ...(known || {}), ...product, category: known ? known.category : "", categoryId: known ? known.categoryId : null });
        return product;
    }

    function writeSession(phone, name, email) {
        writeStore(STORE.session, { phone: showPhone(phone), name: name || "", email: email || "" });
        if (typeof applyAuthState === "function") applyAuthState();
    }

    async function mergeGuestData() {
        const cart = cartLines().map(l => ({ product_id: l.id, variant_id: l.vid || null, quantity: l.q, customization_note: l.cn || "" }));
        const wishlist = Object.values(Live.wish.rows()).map(r => ({ product_id: r.id, variant_id: r.vid || null }));
        if (cart.length || wishlist.length) {
            await http("/cart-wishlist/merge/", { method: "POST", body: { cart, wishlist } });
        }
    }

    async function finishAuth(r, phone) {
        if (!r.ok || !r.data.status || !r.data.access) return fail(errMsg(r.data, "Could not sign in. Please try again."));
        tok.set(r.data.access, r.data.refresh);
        const p = await http("/api/auth/profile/");
        const prof = p.ok && p.data.data ? p.data.data : {};
        writeSession(prof.phone || phone, realName(prof.name, prof.phone || phone), prof.email);
        await mergeGuestData();
        ls.del(STORE.cart); ls.del(STORE.wish); ls.del(KEY.wishRows);
        await Promise.all([syncCart(), syncWish()]);
        if (typeof window.bxIdentify === "function") window.bxIdentify(showPhone(prof.phone || phone), prof.name);
        return { status: true, isNewUser: !!r.data.is_new_user };
    }

    const auth = {
        async phoneCheck(phone) {
            const r = await http("/api/auth/phone-check/", { method: "POST", body: { phone }, auth: false });
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not check this number. Please try again."));
            return { status: true, phone, action: r.data.action };
        },
        async register({ phone, name, password }) {
            const body = { phone, password };
            if (name) body.name = name;
            return finishAuth(await http("/api/auth/set-password/", { method: "POST", body, auth: false }), phone);
        },
        async login({ phone, password }) {
            return finishAuth(await http("/api/auth/phone-login/", { method: "POST", body: { phone, password }, auth: false }), phone);
        },
        async google(credential) {
            if (!credential) return fail("Google login failed");
            return finishAuth(await http("/api/auth/google-login/", { method: "POST", body: { credential }, auth: false }), "");
        },
        async logout() {
            const refresh = tok.refresh();
            if (tok.access()) await http("/api/auth/logout/", { method: "POST", body: { refresh } });
            expireSession();
            return { status: true };
        },
        async sendOtp(phone) {
            const r = await http("/api/send-otp/", { method: "POST", body: { phone }, auth: false });
            if (!r.ok || r.data.success === false) return fail(errMsg(r.data, "Could not send the code. Please try again."));
            return { status: true, message: r.data.message || "Code sent" };
        },
        async verifyOtp(phone, otp) {
            const r = await http("/api/verify-otp/", { method: "POST", body: { phone, otp }, auth: false });
            if (!r.ok || !r.data.verified) return fail(errMsg(r.data, "That code is not correct"));
            return { status: true };
        },
        async resetPassword({ phone, otp, password }) {
            return finishAuth(await http("/api/auth/reset-password/", { method: "POST", body: { phone, otp, password }, auth: false }), phone);
        },
        async getProfile() {
            const r = await http("/api/auth/profile/");
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not load your profile"));
            const d = r.data.data || {};
            return { status: true, data: { phone: showPhone(d.phone), name: realName(d.name, d.phone), email: d.email || "", whatsapp: d.whatsapp || "" } };
        },
        async saveProfile({ name, whatsapp }) {
            const r = await http("/api/auth/profile/", { method: "PUT", body: { name, whatsapp } });
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not save your profile"));
            const s = getSession();
            if (s) writeSession(s.phone, name, s.email);
            return { status: true };
        }
    };

    const addrOut = a => ({ id: String(a.id), name: a.name || "", phone: showPhone(a.phone), district: a.district || "", address: a.address || "" });

    const addresses = {
        async list() {
            const r = await http("/api/addresses/");
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not load your addresses"));
            return { status: true, data: (r.data.data || []).map(addrOut) };
        },
        async save({ id, name, phone, district, address }) {
            const body = { name, phone, district, address };
            const r = id
                ? await http(`/api/addresses/${encodeURIComponent(id)}/`, { method: "PUT", body })
                : await http("/api/addresses/", { method: "POST", body });
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not save this address"));
            return { status: true, data: r.data.data ? addrOut(r.data.data) : null };
        },
        async remove(id) {
            const r = await http(`/api/addresses/${encodeURIComponent(id)}/`, { method: "DELETE" });
            if (!r.ok || r.data.status === false) return fail(errMsg(r.data, "Could not delete this address"));
            return { status: true };
        }
    };

    const itemsPayload = lines => lines.filter(l => !l.is_gift).map(l => ({
        product_id: l.id, variant_id: l.vid || null, quantity: l.q, ...(l.cn ? { customization_note: l.cn } : {})
    }));

    const checkout = {
        async summary({ lines, district }) {
            const use = (lines || []).filter(l => l && l.q > 0 && !l.gone);
            if (!use.length) return fail("No items to checkout");
            const params = new URLSearchParams();
            if (district) params.set("district", district);
            if (loggedIn() && use.every(l => l.cid)) use.forEach(l => params.append("cart_ids", l.cid));
            else params.set("items", JSON.stringify(itemsPayload(use)));

            const r = await http("/api/checkout/summary/", { query: params.toString() });
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not load your order summary"));
            const d = r.data.data || {};
            const items = (d.items || []).map(i => {
                const src = use.find(l => l.id === i.product_id && (l.vid || null) === (i.variant_id || null)) || {};
                const prod = productById(i.product_id) || {};
                return {
                    product_id: i.product_id, variant_id: i.variant_id || null, product: i.product, variant: i.variant || {},
                    quantity: i.quantity, price: num(i.price), total: num(i.total), delivery_charge: num(i.delivery_charge),
                    is_gift: !!i.is_gift, customization_note: i.customization_note || src.cn || "", image: src.im || prod.image || "", emoji: "", colors: ["#1b8f8a", "#00383b"], cart_id: i.cart_id || null
                };
            });
            return { status: true, data: { items, subtotal: num(d.subtotal), delivery_charge: num(d.delivery_charge), grand_total: num(d.grand_total) } };
        },

        async coupon({ code, phone, lines }) {
            const r = await http("/site/api/apply-coupon/", { method: "POST", body: { code, phone, items: itemsPayload(lines || []) } });
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "This coupon code is not valid"));
            const d = r.data.data || {};
            return { status: true, code: d.code || code, discount: num(d.discount_amount), newTotal: num(d.new_total) };
        },

        attempt(payload) {
            return http("/site/api/order-attempt/", { method: "POST", body: payload, auth: false }).catch(() => null);
        },

        async place({ customer, lines, coupon, attribution, otp, note }) {
            const use = (lines || []).filter(l => l && l.q > 0 && !l.gone);
            const body = {
                name: customer.name, phone: customer.phone, address: customer.address, district: customer.district,
                ...(customer.addressId ? { address_id: customer.addressId } : {}),
                coupon_code: coupon || "", ...(attribution || {})
            };
            if (otp) body.otp_code = otp;
            if (note) body.note = note;
            if (loggedIn() && use.every(l => l.cid)) body.cart_ids = use.map(l => l.cid);
            else body.items = itemsPayload(use);

            const r = await http("/api/checkout/place-order/", { method: "POST", body });
            if (r.data && r.data.otp_required) return { status: false, otpRequired: true, message: r.data.message || "" };
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not place your order. Please try again."));
            if (loggedIn()) await Promise.all([syncCart(), syncWish()]);
            else if (!use.some(l => l.__buyNow)) {
                const bought = new Set(use.map(lineKey));
                saveCart(cartLines().filter(l => !bought.has(lineKey(l))));
            }
            const bill = r.data.bill || null;
            if (bill && bill.customer) bill.customer.phone = showPhone(bill.customer.phone);
            return { status: true, order_id: r.data.order_id, bill, message: r.data.message };
        }
    };

    function isoDate(s) {
        const t = String(s || "");
        const m = t.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
        if (!m) return t;
        const d = new Date(`${m[1]} ${m[2]} ${m[3]} 12:00:00`);
        return isNaN(d) ? t : d.toISOString();
    }

    const orderItem = i => ({
        name: i.name, qty: num(i.qty), price: num(i.price), total: num(i.total) || num(i.price) * num(i.qty),
        image: abs(i.image), emoji: "", colors: ["#1b8f8a", "#00383b"], variant: i.variant && typeof i.variant === "object" ? i.variant : {}, note: i.customization_note || ""
    });

    const orders = {
        async list() {
            const r = await http("/api/order/my-orders/");
            if (!r.ok || !r.data.status) return fail(errMsg(r.data, "Could not load your orders"));
            return {
                status: true,
                data: (r.data.data || []).map(o => ({
                    order_id: o.order_id, date: isoDate(o.date), status: o.status, payment_status: o.payment_status,
                    total: num(o.total), items: (o.items || []).map(orderItem)
                }))
            };
        },
        async get(id) {
            const r = await http(`/api/order/${encodeURIComponent(id)}/`);
            if (!r.ok || !r.data.status) return fail(r.status === 404 ? "We could not find this order" : errMsg(r.data, "Could not load this order"));
            const o = r.data.data || {};
            const subtotal = num(o.subtotal), shipping = num(o.shipping), total = num(o.total);
            return {
                status: true,
                data: {
                    order_id: o.order_id, date: o.date, status: o.status, payment_status: o.payment_status,
                    payment_type: String(o.payment_type || "COD").toLowerCase() === "cod" ? "cod" : String(o.payment_type || "").toLowerCase(),
                    subtotal, shipping, total, discount: Math.max(0, subtotal + shipping - total),
                    customer_name: o.customer_name || "", customer_phone: showPhone(o.customer_phone), address: o.address || "",
                    items: (o.items || []).map(orderItem)
                }
            };
        }
    };

    Object.assign(Live, { normList, productDetail, auth, addresses, checkout, orders });
})();


