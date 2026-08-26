import { useRef, useState } from "react";
import {
  BookPlus,
  Check,
  FileUp,
  ListChecks,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { importEpub, type ImportedBook } from "./epub";

type Props = { onImported: (book: ImportedBook) => void; onCancel: () => void };

export function BookImporter({ onImported, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("Choose an EPUB up to 50 MB.");
  const [book, setBook] = useState<ImportedBook | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    setStatus("working");
    setMessage("Reading the book structure and building lesson blocks…");
    try {
      const imported = await importEpub(file);
      setBook(imported);
      setStatus("done");
      setMessage(`Created ${imported.chapters.length} reading pages.`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The book could not be imported.",
      );
    }
  }

  return (
    <div className="import-page mount">
      <header className="import-heading">
        <span className="pill">LOCAL · NON-AI</span>
        <h2>Turn another chess book into a course</h2>
        <p>
          ChessQuest reads the EPUB’s real chapters and divides the complete
          text into comfortable reading pages. Nothing is generated or sent
          away.
        </p>
      </header>
      <section className={`import-drop card import-drop--${status}`}>
        <input
          ref={inputRef}
          id="epub-file"
          type="file"
          accept=".epub,application/epub+zip"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        {status === "working" ? (
          <LoaderCircle className="spin" aria-hidden="true" />
        ) : status === "done" ? (
          <Check aria-hidden="true" />
        ) : (
          <FileUp aria-hidden="true" />
        )}
        <h3>{status === "done" ? book?.title : "Add an EPUB book"}</h3>
        <p aria-live="polite">{message}</p>
        {status !== "working" && (
          <button
            className="button button--outline"
            onClick={() => inputRef.current?.click()}
          >
            {status === "done" ? "Choose a different book" : "Choose EPUB"}
          </button>
        )}
      </section>
      {book && (
        <section className="import-preview card">
          <div className="preview-title">
            <div className="book-cover book-cover--1">
              <BookPlus aria-hidden="true" />
            </div>
            <div>
              <span className="eyebrow">Generated course preview</span>
              <h3>{book.title}</h3>
              <p>
                {book.author} · {book.chapters.length} sections
              </p>
            </div>
          </div>
          <div className="generated-list">
            {book.chapters.slice(0, 5).map((chapter, index) => (
              <div key={chapter.id}>
                <span>{index + 1}</span>
                <div>
                  <strong>{chapter.title}</strong>
                  <small>{chapter.activity.replace(/-/g, " ")} · {chapter.questionCount ? `${chapter.questionCount} practice prompt${chapter.questionCount === 1 ? "" : "s"}` : chapter.moveCount ? `${chapter.moveCount} notation example${chapter.moveCount === 1 ? "" : "s"}` : "reading and recall lesson"}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="import-actions">
            <button className="button button--quiet" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="button button--primary"
              onClick={() => onImported(book)}
            >
              <ListChecks aria-hidden="true" />
              Add book to library
            </button>
          </div>
        </section>
      )}
      <aside className="privacy-note">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Your book stays on this device</strong>
          <p>
            Importing happens locally. ChessQuest stores the reading pages and
            metadata needed to preserve your place.
          </p>
        </div>
      </aside>
    </div>
  );
}
