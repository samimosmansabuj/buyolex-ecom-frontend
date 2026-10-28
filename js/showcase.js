let SHOWCASE = [];
const SHOWCASE_TINTS = [["#1b8f8a", "#00383b"], ["#c8935a", "#6e4423"], ["#2fd0bb", "#00504f"], ["#d9b26f", "#7a5a1f"]];

function showcaseEmbedUrl(item) {
    const url = item.video;
    if (!url) return null;
    if (item.video_platform === "youtube") {
        let id = "";
        try { const u = new URL(url); id = u.hostname.includes("youtu.be") ? u.pathname.slice(1) : (u.searchParams.get("v") || ""); } catch (e) {  }
        return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0` : null;
    }
    if (item.video_platform === "facebook") return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=true`;
    if (item.video_platform === "instagram") return url.split("?")[0].replace(/\/$/, "") + "/embed";
    return null;
}

function renderShowcase(items) {
    const section = $("#showcaseSection");
    SHOWCASE = items;
    section.hidden = !sectionOn("showcase") || !items.length;
    if (section.hidden) return;

    $("#showcaseRow").innerHTML = items.map((item, i) => {
        const poster = resolveAssetUrl(item.image);
        const fileVideo = item.video_platform === "file" && item.video;
        const [c1, c2] = SHOWCASE_TINTS[i % SHOWCASE_TINTS.length];
        const media = fileVideo
            ? (poster ? `<img src="${esc(poster)}" alt="" class="showcase-poster">` : "") +
              `<video muted loop playsinline preload="metadata" src="${esc(resolveAssetUrl(item.video))}"${poster ? ` poster="${esc(poster)}"` : ""}></video>`
            : poster ? `<img src="${esc(poster)}" alt="${esc(item.title)}" loading="lazy">` : "";
        return `<div class="showcase-card" data-index="${i}" data-video="${!!item.video}" tabindex="0" style="background:linear-gradient(145deg,${c1},${c2})">${media}` +
            `<div class="showcase-overlay"></div>${item.video ? '<div class="showcase-play">▶</div>' : ""}` +
            `<div class="showcase-copy"><div class="showcase-copy-title">${esc(item.title)}</div>${item.subtitle ? `<div class="showcase-copy-sub">${esc(item.subtitle)}</div>` : ""}</div></div>`;
    }).join("");
}

function playShowcaseCard(card) {
    const item = SHOWCASE[Number(card.dataset.index)];
    if (!item || !item.video) return;
    const video = card.querySelector("video");
    if (video) { video.play().catch(() => {}); card.classList.add("is-playing"); return; }
    const embed = showcaseEmbedUrl(item);
    if (embed && !card.querySelector("iframe")) {
        const frame = document.createElement("iframe");
        frame.src = embed;
        frame.allow = "autoplay; encrypted-media";
        frame.title = item.title || "Video";
        frame.className = "showcase-frame";
        card.appendChild(frame);
        card.classList.add("is-playing");
    } else if (!embed) {
        window.open(safeHref(item.video), "_blank", "noopener");
    }
}

function stopShowcaseCard(card) {
    const video = card.querySelector("video");
    if (video) { video.pause(); video.currentTime = 0; }
    card.classList.remove("is-playing");
}

document.addEventListener("click", e => {
    const nav = e.target.closest("[data-showcase]");
    if (nav) {
        const row = $("#showcaseRow");
        row.scrollBy({ left: Number(nav.dataset.showcase) * (row.clientWidth * 0.8), behavior: "smooth" });
        return;
    }
    const card = e.target.closest(".showcase-card");
    if (card && card.dataset.video === "true" && !window.matchMedia("(hover:hover)").matches) {
        if (card.classList.contains("is-playing")) stopShowcaseCard(card);
        else { $$(".showcase-card.is-playing").forEach(stopShowcaseCard); playShowcaseCard(card); }
    }
});

document.addEventListener("mouseover", e => {
    const card = e.target.closest(".showcase-card");
    if (card && card.dataset.video === "true" && window.matchMedia("(hover:hover)").matches) playShowcaseCard(card);
});
document.addEventListener("mouseout", e => {
    const card = e.target.closest(".showcase-card");
    if (card && !card.contains(e.relatedTarget)) stopShowcaseCard(card);
});


