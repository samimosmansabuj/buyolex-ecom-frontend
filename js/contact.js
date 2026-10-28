document.addEventListener("DOMContentLoaded", () => {
    const form = $("#contactForm");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const btn = $("#cfSend");
        btn.disabled = true;
        try {
            const r = await apiSendContact({
                name: $("#cfName").value, email: $("#cfEmail").value, phone: $("#cfPhone").value,
                subject: $("#cfSubject").value, message: $("#cfMessage").value
            });
            if (!r.status) return toast(r.message);
            form.reset();
            $("#contactOk").hidden = false;
            toast("Message sent ✅");
        } finally {
            btn.disabled = false;
        }
    });
});


