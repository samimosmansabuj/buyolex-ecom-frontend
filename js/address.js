let ADDRESSES = [];
let editingId = null;
let ACCOUNT_PROFILE = null;

function addressCardHtml(a) {
    return `<div class="addr-card panel g"><div class="addr-top"><b>${esc(a.name)}</b><span class="mute small">${esc(a.phone)}</span></div>` +
        `<p>${esc(a.address)}</p><p class="mute small">${esc(a.district)}</p>` +
        `<div class="addr-actions"><button type="button" class="ghost g" data-edit="${esc(a.id)}">Edit</button>` +
        `<button type="button" class="ghost g danger" data-del="${esc(a.id)}">Delete</button></div></div>`;
}

function renderAddresses() {
    $("#addressCount").textContent = ADDRESSES.length ? `(${ADDRESSES.length} saved)` : "";
    $("#addressList").innerHTML = ADDRESSES.length
        ? ADDRESSES.map(addressCardHtml).join("")
        : `<div class="panel g" style="text-align:center"><p class="mute">No saved addresses yet. Add one using the form.</p></div>`;
}

function resetAddressForm() {
    editingId = null;
    $("#addressForm").reset();
    $("#addrDistrict").innerHTML = districtOptions();
    if (ACCOUNT_PROFILE) { $("#addrName").value = ACCOUNT_PROFILE.name; $("#addrPhone").value = ACCOUNT_PROFILE.phone; }
    $("#addressFormTitle").textContent = "Add new address";
    $("#addrSaveBtn").textContent = "Save address";
    $("#addrCancelBtn").hidden = true;
}

function editAddress(id) {
    const a = ADDRESSES.find(x => x.id === id);
    if (!a) return;
    editingId = id;
    $("#addrName").value = a.name;
    $("#addrPhone").value = a.phone;
    $("#addrDistrict").innerHTML = districtOptions(a.district);
    $("#addrText").value = a.address;
    $("#addressFormTitle").textContent = "Edit address";
    $("#addrSaveBtn").textContent = "Update address";
    $("#addrCancelBtn").hidden = false;
    $("#addressForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function loadAddresses() {
    const r = await apiListAddresses();
    ADDRESSES = r.status ? r.data : [];
    renderAddresses();
}

async function saveAddressForm(e) {
    e.preventDefault();
    const btn = $("#addrSaveBtn");
    btn.disabled = true;
    try {
        const r = await apiSaveAddress({
            id: editingId, name: $("#addrName").value, phone: $("#addrPhone").value,
            district: $("#addrDistrict").value, address: $("#addrText").value
        });
        if (!r.status) return toast(r.message);
        toast(editingId ? "Address updated ✅" : "Address saved ✅");
        resetAddressForm();
        await loadAddresses();
    } finally {
        btn.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireLogin()) return;

    await loadDistricts();
    const p = await apiGetProfile();
    if (p.status) ACCOUNT_PROFILE = p.data;
    resetAddressForm();
    await loadAddresses();

    $("#addressForm").addEventListener("submit", saveAddressForm);
    $("#addrCancelBtn").addEventListener("click", resetAddressForm);

    $("#addressList").addEventListener("click", async e => {
        const edit = e.target.closest("[data-edit]");
        if (edit) return editAddress(edit.dataset.edit);

        const del = e.target.closest("[data-del]");
        if (del && confirm("Delete this address?")) {
            await apiDeleteAddress(del.dataset.del);
            if (editingId === del.dataset.del) resetAddressForm();
            toast("Address deleted");
            await loadAddresses();
        }
    });
});


