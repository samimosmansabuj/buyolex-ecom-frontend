(function () {
    'use strict';

    var IS_LOCAL = location.protocol === 'file:' ||
        ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) !== -1;

    function extractProductSlug() {
        var match = window.location.pathname.match(/\/product\/([^/?#]+)/i);
        if (match && match[1]) return decodeURIComponent(match[1]);
        var slug = new URLSearchParams(window.location.search).get('slug');
        return slug || null;
    }

    var detectedSlug = extractProductSlug();
    if (detectedSlug) window.__PRODUCT_SLUG__ = detectedSlug;

    window.getProductSlug = function () {
        return window.__PRODUCT_SLUG__ || extractProductSlug();
    };

    function cleanCurrentUrl() {
        var pathname = window.location.pathname;
        var search = window.location.search;
        var hash = window.location.hash;

        if (pathname.endsWith('product-details.html')) {
            if (!IS_LOCAL && detectedSlug) {
                var params = new URLSearchParams(search);
                params.delete('slug');
                var rest = params.toString() ? '?' + params.toString() : '';
                window.history.replaceState(null, '', '/product/' + encodeURIComponent(detectedSlug) + rest + hash);
            }
            return;
        }

        if (pathname.endsWith('/index.html')) {
            window.history.replaceState(null, '', '/' + search + hash);
            return;
        }

        if (pathname.endsWith('.html')) {
            window.history.replaceState(null, '', pathname.replace(/\.html$/i, '') + search + hash);
        }
    }

    cleanCurrentUrl();

    window.navigateTo = function (url) {
        if (!url) return;
        if (url.indexOf('product-details.html') !== -1 && !IS_LOCAL) {
            try {
                var parsed = new URL(url, window.location.origin);
                var slug = parsed.searchParams.get('slug');
                if (slug) {
                    parsed.searchParams.delete('slug');
                    var q = parsed.searchParams.toString() ? '?' + parsed.searchParams.toString() : '';
                    window.location.href = '/product/' + encodeURIComponent(slug) + q + parsed.hash;
                    return;
                }
            } catch (e) {  }
        }
        window.location.href = url;
    };
})();


