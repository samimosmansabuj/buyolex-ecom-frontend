const DISTRICT_API = "https://bdapi.vercel.app/api/v.1/district";
let DISTRICTS = [];

async function loadDistricts() {
    if (DISTRICTS.length) return DISTRICTS;
    try {
        const res = await fetch(DISTRICT_API);
        const data = await res.json();
        if (data.status === 200 && data.success && Array.isArray(data.data)) DISTRICTS = data.data.map(d => d.name);
    } catch (e) {
        toast("Could not load districts. Check your connection.");
    }
    return DISTRICTS;
}

function districtOptions(selected = "") {
    return `<option value="">Select district</option>` +
        DISTRICTS.map(name => `<option value="${esc(name)}"${name === selected ? " selected" : ""}>${esc(name)}</option>`).join("");
}


