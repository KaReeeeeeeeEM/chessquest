const board = document.querySelector("[data-chess-board]");
if (board) {
  const position = ["♜","♞","♝","♛","♚","♝","♞","♜","♟","♟","♟","♟","♟","♟","♟","♟","","","","","","","","","","","","","","","","","","","","","♙","","","","","","","","","♘","","","♙","♙","♙","♙","","♙","♙","♙","♖","♘","♗","♕","♔","♗","","♖"];
  position.forEach((piece, index) => { const square = document.createElement("span"); square.className = (Math.floor(index / 8) + index % 8) % 2 ? "dark" : "light"; square.textContent = piece; board.appendChild(square); });
}

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } }), { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach((section) => observer.observe(section));

const RELEASES_API = "https://api.github.com/repos/KaReeeeeeeeEM/chessquest/releases";
const PLATFORM_DETAILS = {
  android: { label: "Android", extensions: [".apk"] },
  macos: { label: "macOS", extensions: [".dmg"] },
  windows: { label: "Windows", extensions: [".exe", ".msi"] },
  linux: { label: "Linux", extensions: [".AppImage", ".deb"] },
};

function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("android")) return "android";
  if (userAgent.includes("windows")) return "windows";
  if (userAgent.includes("macintosh") || userAgent.includes("mac os")) return "macos";
  if (userAgent.includes("linux") || userAgent.includes("x11")) return "linux";
  const platform = `${navigator.userAgentData?.platform || ""} ${navigator.platform || ""}`.toLowerCase();
  if (platform.includes("win")) return "windows";
  if (platform.includes("mac")) return "macos";
  if (platform.includes("linux")) return "linux";
  return null;
}

function findAsset(assets = [], platform) {
  const extensions = PLATFORM_DETAILS[platform]?.extensions || [];
  return extensions.map((extension) => assets.find((asset) => asset.name.endsWith(extension))).find(Boolean);
}

function makeDownloadLink(asset, platform, className = "download-row-button") {
  const link = document.createElement("a");
  link.className = className;
  link.href = asset.browser_download_url;
  link.setAttribute("aria-label", `Download ChessQuest for ${PLATFORM_DETAILS[platform].label}`);
  link.append(`Download for ${PLATFORM_DETAILS[platform].label} `);
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "↓";
  link.append(icon);
  return link;
}

function availableAssets(release) {
  return Object.keys(PLATFORM_DETAILS)
    .map((platform) => ({ platform, asset: findAsset(release.assets, platform) }))
    .filter(({ asset }) => Boolean(asset));
}

function updateRecommendedDownload(release, platform) {
  const recommended = (platform && findAsset(release.assets, platform)) || availableAssets(release)[0]?.asset;
  const recommendedPlatform = platform && findAsset(release.assets, platform) ? platform : availableAssets(release)[0]?.platform;
  if (!recommended || !recommendedPlatform) return;

  document.querySelectorAll("[data-download-latest]").forEach((link) => {
    link.href = recommended.browser_download_url;
    const label = link.querySelector("[data-download-label]");
    if (label) label.textContent = link.dataset.shortLabel === "true" ? "Download" : `Download for ${PLATFORM_DETAILS[recommendedPlatform].label}`;
    link.setAttribute("aria-label", `Download the latest ChessQuest release for ${PLATFORM_DETAILS[recommendedPlatform].label}`);
  });

  const platformLabel = document.querySelector("[data-recommended-platform]");
  if (platformLabel) platformLabel.textContent = PLATFORM_DETAILS[recommendedPlatform].label;
  const assetLabel = document.querySelector("[data-recommended-asset]");
  if (assetLabel) assetLabel.textContent = `${recommended.name.split(".").pop()} · ${(recommended.size / 1_000_000).toFixed(1)} MB`;
}

function renderLatestRelease(release, platform) {
  const title = document.querySelector("[data-latest-title]");
  if (title) title.textContent = release.name || release.tag_name;
  const date = document.querySelector("[data-latest-date]");
  if (date) date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(release.published_at));
  updateRecommendedDownload(release, platform);
}

function renderReleaseHistory(releases) {
  const releaseList = document.querySelector("#release-list");
  if (!releaseList) return;
  releaseList.replaceChildren(...releases.map((release) => {
    const article = document.createElement("article");
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = release.name || release.tag_name;
    const date = document.createElement("span");
    date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(release.published_at));
    info.append(name, date);
    const description = document.createElement("p");
    description.textContent = release.body?.replace(/\\n/g, "\n").split("\n")[0] || "ChessQuest release.";
    const actions = document.createElement("div");
    actions.className = "release-actions";
    availableAssets(release).forEach(({ platform, asset }) => actions.append(makeDownloadLink(asset, platform)));
    if (!actions.children.length) {
      const notes = document.createElement("a");
      notes.className = "download-row-button";
      notes.href = release.html_url;
      notes.textContent = "View release →";
      actions.append(notes);
    }
    article.append(info, description, actions);
    return article;
  }));
}

fetch(RELEASES_API)
  .then((response) => response.ok ? response.json() : Promise.reject(new Error("Release request failed")))
  .then((releases) => {
    if (!Array.isArray(releases) || !releases.length) return;
    const platform = detectPlatform();
    renderLatestRelease(releases[0], platform);
    renderReleaseHistory(releases);
  })
  .catch(() => { /* Keep usable links to the GitHub release page when the API is unavailable. */ });
