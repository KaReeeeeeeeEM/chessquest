import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const pieces = [
  {
    name: "King",
    glyph: "♔",
    move: "One square in any direction. It may never move into check.",
  },
  {
    name: "Queen",
    glyph: "♕",
    move: "Any distance along a rank, file, or diagonal.",
  },
  { name: "Rook", glyph: "♖", move: "Any distance along a rank or file." },
  {
    name: "Bishop",
    glyph: "♗",
    move: "Any distance diagonally; it stays on one square colour.",
  },
  {
    name: "Knight",
    glyph: "♘",
    move: "An L shape: two squares one way, then one sideways. It can jump.",
  },
  {
    name: "Pawn",
    glyph: "♙",
    move: "Forward one, optionally two from its start; it captures one diagonal forward.",
  },
];

export function ChessFoundations() {
  const [step, setStep] = useState(0);
  const [challenge, setChallenge] = useState(() =>
    Math.floor(Math.random() * 64),
  );
  const [pieceIndex, setPieceIndex] = useState(() =>
    Math.floor(Math.random() * pieces.length),
  );
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"idle" | "right" | "wrong">("idle");
  const square = useMemo(
    () => `${"abcdefgh"[challenge % 8]}${8 - Math.floor(challenge / 8)}`,
    [challenge],
  );
  const lessons = [
    "Meet the board",
    "Know the pieces",
    "How each piece moves",
    "Coordinate challenge",
  ];
  function nextChallenge() {
    setChallenge(Math.floor(Math.random() * 64));
    setPieceIndex(Math.floor(Math.random() * pieces.length));
    setAnswer("");
    setResult("idle");
  }
  function submit() {
    const correct = answer.trim().toLowerCase() === square;
    setResult(correct ? "right" : "wrong");
    if (correct)
      localStorage.setItem("cq-chess-foundations-coordinate", "passed");
  }
  return (
    <div className="course-page mount">
      <header className="course-hero">
        <div>
          <span className="eyebrow">Chess foundations · Course 1</span>
          <h2>Know the board before calculating moves</h2>
          <p>
            Every ChessQuest learner starts here: orientation, piece names,
            movement, and fluent square recognition.
          </p>
        </div>
        <span className="course-progress">
          {step + 1} / {lessons.length}
        </span>
      </header>
      <nav className="course-steps" aria-label="Course lessons">
        {lessons.map((lesson, index) => (
          <button
            key={lesson}
            className={index === step ? "active" : ""}
            aria-current={index === step ? "step" : undefined}
            onClick={() => setStep(index)}
          >
            <span>{index + 1}</span>
            {lesson}
          </button>
        ))}
      </nav>
      <section className="course-stage card">
        {step === 0 && (
          <div className="foundation-layout">
            <div>
              <BookOpen className="course-icon" />
              <h3>The board is a map</h3>
              <p>
                A chessboard has 8 files named <strong>a–h</strong> and 8 ranks
                numbered <strong>1–8</strong>. White’s near-right corner is
                light: “white on right.” Name a square file-first, such as e4.
              </p>
              <ul className="learning-list">
                <li>Files run vertically and use letters.</li>
                <li>Ranks run horizontally and use numbers.</li>
                <li>White begins on ranks 1–2; Black begins on 7–8.</li>
              </ul>
            </div>
            <FoundationBoard labels />
          </div>
        )}
        {step === 1 && (
          <div>
            <h3>Six pieces, six jobs</h3>
            <div className="piece-guide">
              {pieces.map((piece) => (
                <article key={piece.name}>
                  <span>{piece.glyph}</span>
                  <div>
                    <strong>{piece.name}</strong>
                    <p>{piece.move}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h3>Learn movement by shape</h3>
            <p>
              Long-range pieces cannot pass through another piece. The knight is
              the exception. Pawns are the only pieces whose capture differs
              from their ordinary move.
            </p>
            <div className="movement-cards">
              {pieces.map((piece) => (
                <article key={piece.name}>
                  <span>{piece.glyph}</span>
                  <strong>{piece.name}</strong>
                  <p>{piece.move}</p>
                </article>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="coordinate-quiz">
            <div>
              <Crosshair className="course-icon" />
              <span className="eyebrow">
                No coordinate labels—use your mental map
              </span>
              <h3>
                Which square holds the {pieces[pieceIndex].name.toLowerCase()}?
              </h3>
              <p>
                Enter the file and rank together, for example{" "}
                <strong>c6</strong>.
              </p>
              <div className="coordinate-answer">
                <Input
                  aria-label="Square coordinate"
                  value={answer}
                  maxLength={2}
                  placeholder="e4"
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    setResult("idle");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submit();
                  }}
                />
                <Button onClick={submit}>Check square</Button>
              </div>
              {result !== "idle" && (
                <div
                  className={`quiz-result quiz-result--${result}`}
                  role="status"
                >
                  {result === "right" ? (
                    <>
                      <Check />
                      Exactly right. That is {square}.
                    </>
                  ) : (
                    <>
                      Not quite. Trace the file first, then the rank, and try
                      again.
                    </>
                  )}{" "}
                </div>
              )}
              {result === "right" && (
                <Button variant="outline" onClick={nextChallenge}>
                  <RotateCcw />
                  New position
                </Button>
              )}
            </div>
            <FoundationBoard
              piece={pieces[pieceIndex].glyph}
              pieceIndex={challenge}
            />
          </div>
        )}
      </section>
      <footer className="course-controls">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((value) => value - 1)}
        >
          <ChevronLeft />
          Back
        </Button>
        <span>{lessons[step]}</span>
        <Button
          disabled={step === lessons.length - 1}
          onClick={() => setStep((value) => value + 1)}
        >
          Continue
          <ChevronRight />
        </Button>
      </footer>
    </div>
  );
}

function FoundationBoard({
  labels = false,
  piece,
  pieceIndex,
}: {
  labels?: boolean;
  piece?: string;
  pieceIndex?: number;
}) {
  return (
    <div
      className="foundation-board"
      role="img"
      aria-label={
        piece
          ? "Unlabelled chessboard with one piece for a coordinate quiz"
          : "Chessboard showing files and ranks"
      }
    >
      {Array.from({ length: 64 }, (_, index) => (
        <span
          key={index}
          className={
            (Math.floor(index / 8) + (index % 8)) % 2 ? "dark" : "light"
          }
        >
          {pieceIndex === index && <b>{piece}</b>}
          {labels && Math.floor(index / 8) === 7 && (
            <small>{"abcdefgh"[index % 8]}</small>
          )}
          {labels && index % 8 === 0 && <i>{8 - Math.floor(index / 8)}</i>}
        </span>
      ))}
    </div>
  );
}
