function showOtpVerifyModal({ phone, message, submit, onSuccess }) {
    const old = document.getElementById("otpVerifyOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "otpVerifyOverlay";
    overlay.className = "os-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Verify your phone number");
    overlay.innerHTML =
        `<div class="os-modal"><div class="os-card g">` +
        `<div class="ck" style="background:#ffb454;color:#1b1b1b">!</div><h2>Verify your number</h2>` +
        `<p class="mute" style="line-height:1.5">${esc(message || "This number needs to be verified before it can place an order.")}</p>` +
        `<div class="otp-phone">${esc(phone)}</div>` +
        `<div class="otp-msg small" id="otpMsg" role="status"></div>` +
        `<button type="button" class="cta" id="otpSendBtn" style="width:100%">Send code</button>` +
        `<input id="otpCodeInput" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="Enter the 6-digit code" style="display:none;margin-top:12px;width:100%;text-align:center;letter-spacing:.3em">` +
        `<button type="button" class="cta" id="otpVerifyBtn" style="display:none;width:100%;margin-top:10px">Verify &amp; place order</button>` +
        `<button type="button" class="ghost g" id="otpCancelBtn" style="width:100%;margin-top:10px">Cancel</button>` +
        `</div></div>`;
    document.body.appendChild(overlay);
    document.body.classList.add("no-scroll");

    const close = () => { overlay.remove(); document.body.classList.remove("no-scroll"); };
    const say = (text, ok) => { const el = overlay.querySelector("#otpMsg"); el.textContent = text; el.style.color = ok ? "#16a34a" : "#dc2626"; };

    overlay.querySelector("#otpCancelBtn").addEventListener("click", close);

    overlay.querySelector("#otpSendBtn").addEventListener("click", async e => {
        const btn = e.currentTarget;
        btn.disabled = true; btn.textContent = "Sending…";
        const r = await apiSendOtp(phone);
        btn.disabled = false;
        if (r.status) {
            say("Code sent. Check your phone.", true);
            overlay.querySelector("#otpCodeInput").style.display = "block";
            overlay.querySelector("#otpVerifyBtn").style.display = "block";
            overlay.querySelector("#otpCodeInput").focus();
            btn.textContent = "Send again";
        } else {
            say(r.message || "Could not send the code.", false);
            btn.textContent = "Send code";
        }
    });

    overlay.querySelector("#otpVerifyBtn").addEventListener("click", async e => {
        const btn = e.currentTarget;
        const code = overlay.querySelector("#otpCodeInput").value.trim();
        if (code.length < 4) return say("Enter the code from the SMS.", false);
        btn.disabled = true; btn.textContent = "Verifying…";
        const r = await submit(code);
        if (r && r.status) { close(); return onSuccess(r); }
        say((r && r.message) || "That code is not correct or has expired.", false);
        btn.disabled = false; btn.textContent = "Verify & place order";
    });
}


