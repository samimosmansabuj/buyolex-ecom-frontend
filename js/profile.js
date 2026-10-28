document.addEventListener("DOMContentLoaded", async () => {
    if (!requireLogin()) return;

    const r = await apiGetProfile();
    if (!r.status) return toast(r.message);

    $("#profileFullName").value = r.data.name || "";
    $("#profilePhone").value = r.data.phone || "";
    if (!r.data.phone) $("#profilePhone").placeholder = "Not added — you can enter it at checkout";
    $("#profileWhatsapp").value = r.data.whatsapp || "";
    $("#profileEmail").value = r.data.email || "";
    const emailBox = $("#profileEmail").closest("label");
    if (!r.data.email) emailBox.hidden = true; else $("#profileEmail").readOnly = true;

    $("#profileForm").addEventListener("submit", async e => {
        e.preventDefault();
        const btn = $("#profileSaveBtn");
        btn.disabled = true;
        try {
            const res = await apiSaveProfile({
                name: $("#profileFullName").value,
                whatsapp: $("#profileWhatsapp").value,
                email: $("#profileEmail").value
            });
            toast(res.status ? "Profile updated ✅" : res.message);
        } finally {
            btn.disabled = false;
        }
    });
});


