let flowPhone = "";
let flowAction = "";
let flowOtp = "";
let resendTimer = null;

const LOGIN_STEPS = ["phoneStep", "passwordStep", "otpStep", "newPasswordStep"];

function showStep(id) {
    LOGIN_STEPS.forEach(s => { const el = document.getElementById(s); if (el) el.hidden = s !== id; });
    const first = document.querySelector("#" + id + " input:not([hidden])");
    if (first) first.focus();
}

function setBusy(button, busy) {
    if (button) button.disabled = busy;
}

function nextAfterLogin() {
    return safeNext(new URLSearchParams(location.search).get("next"), "profile.html");
}

function finishLogin(message) {
    toast(message);
    setTimeout(() => goTo(nextAfterLogin()), 600);
}

async function submitPhoneStep(e) {
    e.preventDefault();
    const btn = $("#phoneNextBtn");
    setBusy(btn, true);
    try {
        const r = await apiPhoneCheck($("#loginPhone").value);
        if (!r.status) return toast(r.message);

        flowPhone = r.phone;
        flowAction = r.action;

        const register = flowAction === "set_password";
        $("#passwordStepLabel").textContent = register
            ? "New here? Set a password to create your account (6+ characters)."
            : "Welcome back. Enter your password.";
        $("#loginPassword").autocomplete = register ? "new-password" : "current-password";
        $("#loginPassword").placeholder = register ? "Choose a password" : "Password";
        $("#submitPasswordBtn").textContent = "Next";
        $("#forgotPasswordBtn").hidden = register;
        showStep("passwordStep");
    } finally {
        setBusy(btn, false);
    }
}

async function submitPasswordStep(e) {
    e.preventDefault();
    const btn = $("#submitPasswordBtn");
    const password = $("#loginPassword").value;

    if (!password) return toast("Enter your password");
    const register = flowAction === "set_password";
    if (register && password.length < 6) return toast("Password must be at least 6 characters");

    setBusy(btn, true);
    try {
        const r = register
            ? await apiRegister({ phone: flowPhone, password })
            : await apiLogin({ phone: flowPhone, password });

        if (r.status) finishLogin(register ? "Account ready ✅" : "Welcome back ✅");
        else toast(r.message || "Login failed");
    } finally {
        setBusy(btn, false);
    }
}

function startResendCooldown(seconds = 30) {
    const btn = $("#resendOtpBtn");
    clearInterval(resendTimer);
    let left = seconds;
    btn.disabled = true;
    btn.textContent = `Resend OTP (${left}s)`;
    resendTimer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
            clearInterval(resendTimer);
            btn.disabled = false;
            btn.textContent = "Resend OTP";
        } else {
            btn.textContent = `Resend OTP (${left}s)`;
        }
    }, 1000);
}

async function sendOtp() {
    const r = await apiSendOtp(flowPhone);
    if (!r.status) { toast(r.message); return false; }

    toast(r.message);
    startResendCooldown();
    return true;
}

async function startForgotPassword() {
    const btn = $("#forgotPasswordBtn");
    setBusy(btn, true);
    try {
        if (await sendOtp()) {
            $("#resetOtp").value = "";
            showStep("otpStep");
        }
    } finally {
        setBusy(btn, false);
    }
}

async function submitOtpStep(e) {
    e.preventDefault();
    const otp = $("#resetOtp").value.trim();
    if (!/^\d{6}$/.test(otp)) return toast("Enter the 6-digit OTP");

    const btn = $("#submitOtpBtn");
    setBusy(btn, true);
    try {
        const r = await apiVerifyOtp(flowPhone, otp);
        if (!r.status) return toast(r.message);
        flowOtp = otp;
        showStep("newPasswordStep");
    } finally {
        setBusy(btn, false);
    }
}

async function submitResetPasswordStep(e) {
    e.preventDefault();
    const password = $("#newPassword").value;
    if (password.length < 6) return toast("Password must be at least 6 characters");

    const btn = $("#submitNewPasswordBtn");
    setBusy(btn, true);
    try {
        const r = await apiResetPassword({ phone: flowPhone, otp: flowOtp, password });
        if (r.status) finishLogin("Password reset ✅");
        else toast(r.message || "Could not reset password");
    } finally {
        setBusy(btn, false);
    }
}

function backToPhoneStep() {
    flowPhone = ""; flowAction = ""; flowOtp = "";
    clearInterval(resendTimer);
    ["loginPassword", "resetOtp", "newPassword"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    showStep("phoneStep");
}

function togglePasswordVisibility() {
    const input = $("#loginPassword");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    $("#togglePw").textContent = show ? "Hide" : "Show";
    $("#togglePw").setAttribute("aria-label", show ? "Hide password" : "Show password");
}

async function handleGoogleCredential(response) {
    const credential = response && response.credential;
    if (!credential) return toast("Google login failed");
    const r = await apiGoogleLogin(credential);
    if (r.status) finishLogin(r.is_new_user ? "Account ready ✅" : "Welcome back ✅");
    else toast(r.message || "Google login failed");
}

function initGoogleLogin() {
    const clientId = String(window.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) return;

    const start = () => {
        google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential, auto_select: false });
        $("#googleAuth").hidden = false;
        const width = Math.min(400, Math.max(200, Math.floor($("#googleBtn").clientWidth || 300)));
        google.accounts.id.renderButton($("#googleBtn"), { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width });
    };

    if (window.google && google.accounts && google.accounts.id) return start();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = start;
    document.head.appendChild(s);
}

document.addEventListener("DOMContentLoaded", () => {
    if (isLoggedIn()) return goTo(nextAfterLogin());

    $("#phoneStep").addEventListener("submit", submitPhoneStep);
    $("#passwordStep").addEventListener("submit", submitPasswordStep);
    $("#otpStep").addEventListener("submit", submitOtpStep);
    $("#newPasswordStep").addEventListener("submit", submitResetPasswordStep);
    $("#forgotPasswordBtn").addEventListener("click", startForgotPassword);
    $("#resendOtpBtn").addEventListener("click", sendOtp);
    $("#togglePw").addEventListener("click", togglePasswordVisibility);
    $$("[data-back]").forEach(b => b.addEventListener("click", backToPhoneStep));

    initGoogleLogin();
});


