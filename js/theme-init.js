(function () {
    try {
        var t = localStorage.getItem("bx-theme");
        if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;

        var brand = JSON.parse(localStorage.getItem("bx-brand") || "null");
        if (brand && brand.logo) {
            document.documentElement.style.setProperty("--loader-logo", 'url("' + String(brand.logo).replace(/"/g, "%22") + '")');
            document.documentElement.classList.add("has-logo");
        }
    } catch (e) {  }
})();


