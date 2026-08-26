import JSZip from "jszip";

export type InteractiveChapter = {
  id: string;
  title: string;
  excerpt: string;
  moveCount: number;
  activity: "read-and-recall" | "guess-the-move" | "position-study";
};

export type ImportedBook = {
  id: string;
  title: string;
  author: string;
  fileName: string;
  chapters: InteractiveChapter[];
  importedAt: string;
};

const MOVE_PATTERN =
  /(?:^|\s)(?:\d{1,3}\.(?:\.\.)?\s*)?(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)(?=\s|[.,;!?)]|$)/g;
const POSITION_WORDS =
  /\b(position|diagram|white to move|black to move|mate in|problem)\b/i;

function parseXml(source: string, label: string) {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.querySelector("parsererror"))
    throw new Error(`${label} is not valid XML.`);
  return document;
}

function resolvePath(baseFile: string, relativeFile: string) {
  const baseParts = baseFile.split("/").slice(0, -1);
  for (const part of relativeFile.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join("/");
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueId(fileName: string) {
  return `${fileName}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function importEpub(file: File): Promise<ImportedBook> {
  if (!file.name.toLowerCase().endsWith(".epub"))
    throw new Error("Choose an EPUB file.");
  if (file.size > 50 * 1024 * 1024)
    throw new Error("This EPUB is larger than the 50 MB import limit.");

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const containerEntry = zip.file("META-INF/container.xml");
  if (!containerEntry)
    throw new Error("This file is missing META-INF/container.xml.");
  const container = parseXml(
    await containerEntry.async("string"),
    "EPUB container",
  );
  const packagePath = container
    .querySelector("rootfile")
    ?.getAttribute("full-path");
  if (!packagePath)
    throw new Error("The EPUB does not identify its package document.");

  const packageEntry = zip.file(packagePath);
  if (!packageEntry)
    throw new Error("The EPUB package document cannot be found.");
  const packageDocument = parseXml(
    await packageEntry.async("string"),
    "EPUB package",
  );
  const title = cleanText(
    packageDocument.getElementsByTagNameNS("*", "title")[0]?.textContent ||
      file.name.replace(/\.epub$/i, ""),
  );
  const author = cleanText(
    packageDocument.getElementsByTagNameNS("*", "creator")[0]?.textContent ||
      "Unknown author",
  );

  const manifest = new Map<string, string>();
  packageDocument.querySelectorAll("manifest item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const mediaType = item.getAttribute("media-type") || "";
    if (id && href && /xhtml|html/.test(mediaType))
      manifest.set(
        id,
        resolvePath(packagePath, decodeURIComponent(href.split("#")[0])),
      );
  });

  const readingOrder = Array.from(
    packageDocument.querySelectorAll("spine itemref"),
  )
    .map((item) => item.getAttribute("idref"))
    .filter((id): id is string => Boolean(id))
    .map((id) => manifest.get(id))
    .filter((path): path is string => Boolean(path));

  const chapters: InteractiveChapter[] = [];
  function appendChapter(heading: string, paragraphs: string[]) {
    const text = cleanText(paragraphs.join(" "));
    if (text.length < 80) return;
    const words = text.split(" ");
    const pages: string[] = [];
    let page = "";
    words.forEach((word) => {
      if (page.length + word.length + 1 > 1400 && page) {
        pages.push(page);
        page = word;
      } else page = page ? `${page} ${word}` : word;
    });
    if (page) pages.push(page);
    const baseTitle = cleanText(heading).slice(0, 100) || "Untitled section";
    pages.forEach((pageText, pageIndex) => {
      const moveCount = (pageText.match(MOVE_PATTERN) || []).length;
      chapters.push({
        id: `page-${chapters.length + 1}`,
        title:
          pages.length > 1
            ? `${baseTitle} · ${pageIndex + 1} of ${pages.length}`
            : baseTitle,
        excerpt: pageText,
        moveCount,
        activity: POSITION_WORDS.test(pageText)
          ? "position-study"
          : moveCount >= 3
            ? "guess-the-move"
            : "read-and-recall",
      });
    });
  }

  for (const [index, path] of readingOrder.entries()) {
    const entry = zip.file(path);
    if (!entry) continue;
    const html = new DOMParser().parseFromString(
      await entry.async("string"),
      "text/html",
    );
    html
      .querySelectorAll("script,style,nav,svg")
      .forEach((node) => node.remove());
    const nodes = Array.from(
      html.querySelectorAll("h1,h2,h3,h4,p,li,blockquote"),
    );
    let currentHeading = cleanText(
      html.querySelector("title")?.textContent || `Section ${index + 1}`,
    );
    let currentParagraphs: string[] = [];
    for (const node of nodes) {
      const text = cleanText(node.textContent || "");
      if (!text) continue;
      if (/^H[1-4]$/.test(node.tagName)) {
        appendChapter(currentHeading, currentParagraphs);
        currentHeading = text;
        currentParagraphs = [];
      } else if (text.length >= 35) {
        currentParagraphs.push(text);
      }
    }
    appendChapter(currentHeading, currentParagraphs);
  }

  if (!chapters.length)
    throw new Error("No readable chapters were found in this EPUB.");
  return {
    id: uniqueId(file.name),
    title,
    author,
    fileName: file.name,
    chapters,
    importedAt: new Date().toISOString(),
  };
}

export function loadImportedBooks(): ImportedBook[] {
  try {
    return JSON.parse(
      localStorage.getItem("cq-imported-books") || "[]",
    ) as ImportedBook[];
  } catch {
    return [];
  }
}

export function saveImportedBooks(books: ImportedBook[]) {
  localStorage.setItem("cq-imported-books", JSON.stringify(books.slice(0, 20)));
}
