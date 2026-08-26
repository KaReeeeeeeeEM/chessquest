const board = document.querySelector("[data-chess-board]");
if (board) {
  const position = ["♜","♞","♝","♛","♚","♝","♞","♜","♟","♟","♟","♟","♟","♟","♟","♟","","","","","","","","","","","","","","","","","","","","","♙","","","","","","","","","♘","","","♙","♙","♙","♙","","♙","♙","♙","♖","♘","♗","♕","♔","♗","","♖"];
  position.forEach((piece, index) => { const square = document.createElement("span"); square.className = (Math.floor(index / 8) + index % 8) % 2 ? "dark" : "light"; square.textContent = piece; board.appendChild(square); });
}

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } }), { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach((section) => observer.observe(section));

const releaseList = document.querySelector("#release-list");
if (releaseList) {
  fetch("https://api.github.com/repos/KaReeeeeeeeEM/chessquest/releases")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Release request failed")))
    .then((releases) => {
      if (!Array.isArray(releases) || !releases.length) return;
      releaseList.innerHTML = releases.map((release) => {
        const asset = release.assets?.find((item) => item.name.endsWith(".dmg"));
        const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(release.published_at));
        const size = asset ? `${(asset.size / 1_000_000).toFixed(1)} MB` : "Release notes";
        const href = asset?.browser_download_url || release.html_url;
        const description = release.body?.replace(/\\n/g, "\n").split("\n")[0] || "ChessQuest release.";
        return `<article><div><strong>${release.name || release.tag_name}</strong><span>${date} · macOS · ${size}</span></div><p>${description}</p><a class="download-row-button" href="${href}">${asset ? "Download" : "View release"} <span>${asset ? "↓" : "→"}</span></a></article>`;
      }).join("");
    })
    .catch(() => { /* Keep the server-rendered latest release fallback. */ });
}
