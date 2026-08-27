import { useEffect, useMemo, useRef, useState } from "react";
import { PageFlip } from "page-flip";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  RotateCcw,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyCheckersMove,
  CHECKERS_RULES,
  chooseCheckersMove,
  createCheckersBoard,
  legalCheckersMoves,
  type CheckersBoard,
  type CheckersDifficulty,
  type CheckersVariant,
} from "./engine";

const modules = [
  {
    title: "The playable squares",
    level: "Foundation",
    copy: "Draughts pieces live on one colour of diagonal squares. Learn the long diagonal, home rows, promotion row, and how numbering changes between 8×8 and 10×10 boards.",
    drill: "Point to every legal destination before touching a piece.",
  },
  {
    title: "Men, tempo and promotion",
    level: "Foundation",
    copy: "A man advances diagonally. Every move spends a tempo; each safe step toward promotion changes the race.",
    drill: "Count each side’s safe moves to king before choosing a race.",
  },
  {
    title: "Compulsory capture",
    level: "Essential tactic",
    copy: "A legal capture is not optional. Strong players use that obligation to pull an opposing piece onto a bad square.",
    drill: "Before every move ask: do I—or my opponent—have a forced jump?",
  },
  {
    title: "Multiple jumps and choice",
    level: "Essential tactic",
    copy: "Continue a capture until the sequence ends. International and Brazilian rules require a line capturing the greatest number; English/American and Russian rules allow a choice.",
    drill: "Trace the entire landing sequence before making the first jump.",
  },
  {
    title: "The two-for-one shot",
    level: "Tactics",
    copy: "Offer one checker so the forced reply exposes two. Sacrifice is often the doorway to a material gain.",
    drill:
      "Find the forcing reply, then count the net material—not the first capture.",
  },
  {
    title: "Forks, squeezes and clearance",
    level: "Tactics",
    copy: "Attack two landing routes, deny a safe tempo, or clear a diagonal for a follow-up capture.",
    drill: "Mark the opponent’s legal replies and remove them one by one.",
  },
  {
    title: "Structure and the bridge",
    level: "Strategy",
    copy: "Connected checkers guard key diagonals. In English/American checkers, keeping a stable back-rank bridge can prevent an easy king.",
    drill: "Break your back rank only when the resulting activity is concrete.",
  },
  {
    title: "King technique",
    level: "Endgame",
    copy: "Short kings fight through contact; flying kings control whole diagonals. Centralization matters, but opposition and escape squares decide conversions.",
    drill:
      "Drive the opposing king toward an edge before collecting loose men.",
  },
  {
    title: "Variant laboratory",
    level: "Rules",
    copy: "Play the same position under all five profiles. Notice forward-only versus backward man captures, flying-king range, maximum-capture selection, and whether crowning ends a jump.",
    drill: "Read the rule card before every variant switch.",
  },
  {
    title: "Deliberate practice plan",
    level: "Practice",
    copy: "Cycle through forced-capture puzzles, short games, and annotated self-review. Accuracy before speed builds the patterns that make tactics feel obvious.",
    drill:
      "Play one slow game, name each forced capture, then replay the turning point.",
  },
] as const;

export function Checkers({
  sounds,
  onSound,
}: {
  sounds: boolean;
  onSound: (kind: "move" | "capture" | "checkmate" | "win") => void;
}) {
  const [tab, setTab] = useState<"course" | "play">("course");
  const [variant, setVariant] = useState<CheckersVariant>(
    () =>
      (localStorage.getItem("cq-checkers-variant") as CheckersVariant) ||
      "american",
  );
  const [difficulty, setDifficulty] = useState<CheckersDifficulty>("casual");
  const [started, setStarted] = useState(false);
  const rules = CHECKERS_RULES[variant];
  useEffect(
    () => localStorage.setItem("cq-checkers-variant", variant),
    [variant],
  );
  if (started) {
    return (
      <div className="checkers-match-screen mount">
        <CheckersGame
          variant={variant}
          difficulty={difficulty}
          onExit={() => setStarted(false)}
          sounds={sounds}
          onSound={onSound}
        />
      </div>
    );
  }
  return (
    <div className="checkers-page mount">
      <header className="checkers-hero">
        <div>
          <span className="eyebrow">A complete draughts path</span>
          <h2>Learn the rule. See the tactic. Play the position.</h2>
          <p>
            Start with foundations, compare the major rulesets, then test your
            decisions against an offline computer.
          </p>
        </div>
        <div className="segmented" aria-label="Checkers section">
          <button
            className={tab === "course" ? "active" : ""}
            onClick={() => setTab("course")}
          >
            <BookOpen />
            Course
          </button>
          <button
            className={tab === "play" ? "active" : ""}
            onClick={() => setTab("play")}
          >
            <Swords />
            Play
          </button>
        </div>
      </header>
      {tab === "course" ? (
        <CheckersCourseBook />
      ) : (
        <div className="checkers-play-layout">
          <section className="checkers-setup card">
            <span className="eyebrow">Choose the rules before you play</span>
            <h3>{rules.name} checkers</h3>
            <div className="checkers-selects">
              <label>
                Variant
                <Select
                  value={variant}
                  onValueChange={(value) => {
                    setVariant(value as CheckersVariant);
                    setStarted(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>{rules.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(CHECKERS_RULES).map(([id, item]) => (
                        <SelectItem key={id} value={id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <label>
                Computer level
                <Select
                  value={difficulty}
                  onValueChange={(value) =>
                    setDifficulty(value as CheckersDifficulty)
                  }
                >
                  <SelectTrigger>
                    <SelectValue>{difficulty}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {["beginner", "casual", "club", "expert"].map((level) => (
                        <SelectItem key={level} value={level}>
                          {level[0].toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <VariantRules variant={variant} />
            <Button className="checkers-start-action" onClick={() => setStarted(true)}>
              Start match
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}

function CheckersCourseBook() {
  const [page, setPage] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const host = document.createElement("div");
    host.className = "reader-flip-book";
    stage.replaceChildren(host);

    modules.forEach((item, index) => {
      const sheet = document.createElement("section");
      sheet.className = "reader-flip-page checkers-flip-page";

      const runningHead = document.createElement("header");
      runningHead.className = "reader-running-head";
      const bookName = document.createElement("span");
      bookName.textContent = "ChessQuest Checkers Course";
      const level = document.createElement("span");
      level.textContent = item.level;
      runningHead.append(bookName, level);

      const scroll = document.createElement("div");
      scroll.className = "reader-page-scroll";
      const title = document.createElement("div");
      title.className = "reader-title-block";
      const eyebrow = document.createElement("span");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = `LESSON ${index + 1}`;
      const heading = document.createElement("h2");
      heading.textContent = item.title;
      const ornament = document.createElement("div");
      ornament.className = "reader-ornament";
      ornament.setAttribute("aria-hidden", "true");
      ornament.innerHTML = "<i></i><span>●</span><i></i>";
      title.append(eyebrow, heading, ornament);

      const prose = document.createElement("div");
      prose.className = "reader-prose checkers-flip-prose";
      const copy = document.createElement("p");
      copy.textContent = item.copy;
      const prompt = document.createElement("aside");
      prompt.className = "checkers-flip-prompt";
      const promptTitle = document.createElement("strong");
      promptTitle.textContent = "Practice before turning the page";
      const promptCopy = document.createElement("p");
      promptCopy.textContent = item.drill;
      prompt.append(promptTitle, promptCopy);
      prose.append(copy, prompt);
      scroll.append(title, prose);

      const folio = document.createElement("footer");
      folio.className = "reader-folio";
      folio.setAttribute("aria-label", `Course page ${index + 1}`);
      const pageNumber = document.createElement("span");
      pageNumber.textContent = String(index + 1);
      folio.append(pageNumber);
      sheet.append(runningHead, scroll, folio);
      host.append(sheet);
    });

    const flipBook = new PageFlip(host, {
      width: 560,
      height: 760,
      size: "stretch",
      minWidth: 280,
      maxWidth: 560,
      minHeight: 380,
      maxHeight: 760,
      startPage: page,
      flippingTime: 720,
      drawShadow: true,
      maxShadowOpacity: 0.35,
      showCover: false,
      usePortrait: true,
      autoSize: true,
      mobileScrollSupport: true,
      clickEventForward: false,
      useMouseEvents: true,
      showPageCorners: true,
      disableFlipByClick: true,
    });
    flipBook.loadFromHTML(host.querySelectorAll<HTMLElement>(".reader-flip-page"));
    flipBook.on("flip", (event) => setPage(event.data));
    flipRef.current = flipBook;
    return () => {
      flipRef.current = null;
      flipBook.destroy();
      stage.replaceChildren();
    };
  }, []);

  return (
    <article className="reader-page checkers-course-reader" aria-label="Interactive checkers course book">
      <div className="reader-flip-shell">
        <div className="reader-flip-stage" ref={stageRef} />
      </div>
      <footer className="reader-next checkers-reader-controls">
        <Button variant="outline" disabled={page === 0} onClick={() => flipRef.current?.flipPrev("top")}>
          <ChevronLeft data-icon="inline-start" />
          Previous page
        </Button>
        <span>Page {page + 1} of {modules.length}</span>
        <Button disabled={page === modules.length - 1} onClick={() => flipRef.current?.flipNext("top")}>
          Next page
          <ChevronRight data-icon="inline-end" />
        </Button>
      </footer>
    </article>
  );
}

function VariantRules({ variant }: { variant: CheckersVariant }) {
  const rule = CHECKERS_RULES[variant];
  return (
    <div className="variant-rules">
      <div>
        <strong>
          {rule.size}×{rule.size}
        </strong>
        <span>{rule.rows * 4 + (rule.size === 10 ? 4 : 0)} pieces each</span>
      </div>
      <div>
        <strong>{rule.flyingKings ? "Flying" : "Short"} kings</strong>
        <span>
          {rule.backwardMen ? "Men capture backward" : "Men capture forward"}
        </span>
      </div>
      <div>
        <strong>
          {rule.maximumCapture ? "Maximum capture" : "Any capture line"}
        </strong>
        <span>
          {rule.crownContinues
            ? "Crowning can continue"
            : "Crowning ends the turn"}
        </span>
      </div>
    </div>
  );
}

function CheckersGame({
  variant,
  difficulty,
  onExit,
  sounds,
  onSound,
}: {
  variant: CheckersVariant;
  difficulty: CheckersDifficulty;
  onExit: () => void;
  sounds: boolean;
  onSound: (kind: "move" | "capture" | "checkmate" | "win") => void;
}) {
  const [board, setBoard] = useState<CheckersBoard>(() =>
    createCheckersBoard(variant),
  );
  const [turn, setTurn] = useState<"light" | "dark">("light");
  const [selected, setSelected] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const soundedWinner = useRef<string | null>(null);
  const legal = useMemo(
    () => legalCheckersMoves(board, turn, variant),
    [board, turn, variant],
  );
  const winner = legal.length ? null : turn === "light" ? "Computer" : "You";
  useEffect(() => {
    if (turn !== "dark" || winner) return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      const move = chooseCheckersMove(board, "dark", variant, difficulty);
      if (move) {
        setBoard((position) => applyCheckersMove(position, move, variant));
        if (sounds) onSound(move.captures.length ? "capture" : "move");
      }
      setTurn("light");
      setThinking(false);
    }, { beginner: 900, casual: 1300, club: 1800, expert: 2400 }[difficulty]);
    return () => window.clearTimeout(timer);
  }, [board, difficulty, onSound, sounds, turn, variant, winner]);
  useEffect(() => {
    if (!winner || soundedWinner.current === winner) return;
    soundedWinner.current = winner;
    if (sounds) onSound(winner === "You" ? "win" : "checkmate");
  }, [onSound, sounds, winner]);
  function choose(index: number) {
    if (turn !== "light" || winner) return;
    if (selected === null) {
      if (legal.some((move) => move.from === index)) setSelected(index);
      return;
    }
    const move = legal.find(
      (candidate) => candidate.from === selected && candidate.to === index,
    );
    if (move) {
      setBoard(applyCheckersMove(board, move, variant));
      if (sounds) onSound(move.captures.length ? "capture" : "move");
      setTurn("dark");
      setSelected(null);
    } else
      setSelected(
        legal.some((candidate) => candidate.from === index) ? index : null,
      );
  }
  const size = CHECKERS_RULES[variant].size;
  return (
    <section className="checkers-game card">
      <div className="checkers-game-head">
        <div>
          <span className="eyebrow">
            {CHECKERS_RULES[variant].name} · {difficulty}
          </span>
          <h3>
            {winner
              ? `${winner} won`
              : thinking
                ? "Opponent is studying the board…"
                : "Your move · light pieces"}
          </h3>
        </div>
        <div className="checkers-game-actions">
          <Button variant="outline" onClick={onExit}>
            <ChevronLeft data-icon="inline-start" />
            Back to match setup
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBoard(createCheckersBoard(variant));
              setTurn("light");
              setSelected(null);
              soundedWinner.current = null;
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Restart match
          </Button>
        </div>
      </div>
      <div
        className="checkers-board"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
        role="grid"
        aria-label={`${CHECKERS_RULES[variant].name} checkers board`}
      >
        {board.map((piece, index) => {
          const playable =
            (Math.floor(index / size) + (index % size)) % 2 === 1;
          const destination =
            selected !== null &&
            legal.some((move) => move.from === selected && move.to === index);
          return (
            <button
              key={index}
              disabled={!playable}
              className={`${playable ? "dark" : "light"} ${selected === index ? "selected" : ""} ${destination ? "destination" : ""}`}
              onClick={() => choose(index)}
              aria-label={`${piece ? `${piece.player} ${piece.king ? "king" : "man"}` : "empty"}, row ${Math.floor(index / size) + 1}, column ${(index % size) + 1}`}
            >
              {piece && (
                <span className={`checker checker--${piece.player}`}>
                  {piece.king && <Crown />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {winner && (
        <div className="checkers-result">
          <Check />
          <strong>
            {winner === "You"
              ? "Excellent conversion."
              : "Review the first forced capture you missed, then try again."}
          </strong>
        </div>
      )}
    </section>
  );
}
