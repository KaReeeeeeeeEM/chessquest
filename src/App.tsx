import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PageFlip } from "page-flip";
import {
  ArrowLeft,
  BookPlus,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  ExternalLink,
  Flame,
  Gamepad2,
  Library,
  LayoutGrid,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings,
  Swords,
  Sun,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { Chess, type Square } from "chess.js";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComputerGame } from "./features/game/ComputerGame";
import { GameReview } from "./features/game/GameReview";
import { type Difficulty } from "./features/game/engine";
import { loadGames, type SavedGame } from "./features/game/review";
import { tipForDay } from "./features/tips/tips";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookImporter } from "./features/library/BookImporter";
import { AppUpdater } from "./features/update/AppUpdater";
import { makeNativeWidgetAvailable, openDesktopWidget, syncNativeWidget } from "./features/widgets/nativeWidgets";
import {
  loadImportedBooks,
  saveImportedBooks,
  type ImportedBook,
} from "./features/library/epub";
import {
  loadReadingProgress,
  localDateKey,
  readingStreak,
  recordPage,
  saveReadingProgress,
  type ReadingProgress,
} from "./features/reading/progress";
import "./App.css";

type View =
  | "home"
  | "lesson"
  | "library"
  | "import"
  | "review"
  | "club"
  | "settings"
  | "widgets"
  | "reader"
  | "games";
type Theme = "light" | "dark";
type FontChoice = "nunito" | "geist" | "serif" | "system" | "verdana" | "mono";
type FontSizeChoice = "compact" | "comfortable" | "large";
type ColorChoice = "forest" | "ocean" | "plum" | "ember";
type SoundStyle = "classic" | "soft" | "silent";
const lessonFen =
  "rnbqkbnr/pppp1ppp/8/4p3/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2";
const glyph: Record<string, string> = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

type ChessSound = "move" | "capture" | "check" | "checkmate";

function playChessSound(kind: ChessSound, style: SoundStyle = "classic") {
  if (style === "silent") return;
  let context: AudioContext;
  try {
    context = new AudioContext();
  } catch {
    return;
  }
  const tones: Record<ChessSound, Array<[number, number, number]>> = {
    move: [[190, 0, 0.07]],
    capture: [
      [145, 0, 0.09],
      [105, 0.055, 0.12],
    ],
    check: [
      [440, 0, 0.09],
      [660, 0.09, 0.15],
    ],
    checkmate: [
      [523, 0, 0.12],
      [392, 0.12, 0.15],
      [262, 0.27, 0.28],
    ],
  };

  tones[kind].forEach(([frequency, delay, duration]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type =
      style === "soft" ? "sine" : kind === "capture" ? "square" : "sine";
    oscillator.frequency.setValueAtTime(
      style === "soft" ? frequency * 0.82 : frequency,
      start,
    );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  });

  window.setTimeout(() => void context.close(), 700);
}

function playStreakCelebration(style: SoundStyle) {
  if (style === "silent") return;
  let context: AudioContext;
  try {
    context = new AudioContext();
  } catch {
    return;
  }
  const notes = style === "soft" ? [392, 494, 587, 784] : [523, 659, 784, 1047];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.085;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.1, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
  });
  window.setTimeout(() => void context.close(), 900);
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "quiet";
}) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function Onboarding({ initialName, onComplete }: { initialName: string; onComplete: (profile: { name: string; difficulty: Difficulty; reminderTime: string; goal: string }) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [goal, setGoal] = useState("understand");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [time, setTime] = useState("19:00");
  const [stepLeaving, setStepLeaving] = useState(false);
  const stepCount = 4;
  function changeStep(next: number) {
    if (stepLeaving || next === step) return;
    setStepLeaving(true);
    window.setTimeout(() => {
      setStep(next);
      setStepLeaving(false);
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 170);
  }
  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <div className={`onboarding-copy ${stepLeaving ? "onboarding-copy--leaving" : ""}`} key={step}>
          {step === 0 && <><span className="eyebrow">WELCOME TO CHESSQUEST</span><h1>Read chess. See it. Play it.</h1><p>ChessQuest turns the books you already own into short reading sessions, playable positions, reviews, and matches—without generative AI.</p><label htmlFor="onboarding-name">What should Coach Rook call you?</label><Input id="onboarding-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" maxLength={32} /></>}
          {step === 1 && <><span className="eyebrow">CHOOSE YOUR NORTH STAR</span><h1>What would make this worthwhile?</h1><p>This sets the emphasis of your home experience. You can still use every feature.</p><div className="onboarding-choices" role="group" aria-label="Learning goal">
            <button className={goal === "understand" ? "active" : ""} onClick={() => setGoal("understand")}><BookPlus /><strong>Understand my books</strong><small>Read in small, memorable sessions</small></button>
            <button className={goal === "play" ? "active" : ""} onClick={() => setGoal("play")}><Gamepad2 /><strong>Play better chess</strong><small>Connect ideas to real games</small></button>
            <button className={goal === "habit" ? "active" : ""} onClick={() => setGoal("habit")}><Flame /><strong>Build a daily habit</strong><small>Keep momentum without pressure</small></button>
          </div></>}
          {step === 2 && <><span className="eyebrow">MEET YOU WHERE YOU ARE</span><h1>How familiar is chess?</h1><p>This chooses a starting recommendation, never a restriction.</p><Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}><SelectTrigger className="onboarding-select"><SelectValue>{difficulty[0].toUpperCase() + difficulty.slice(1)}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="beginner">Beginner · I know how pieces move</SelectItem><SelectItem value="casual">Casual · I play sometimes</SelectItem><SelectItem value="club">Club · I understand tactics</SelectItem><SelectItem value="expert">Expert · Give me a challenge</SelectItem></SelectGroup></SelectContent></Select><div className="onboarding-preview"><Target /><div><strong>Your first recommendation</strong><p>{difficulty === "beginner" ? "Short reading sessions and gentle computer games." : difficulty === "casual" ? "Tactical reading and casual-level games." : "Deeper positions and stronger computer opposition."}</p></div></div></>}
          {step === 3 && <><span className="eyebrow">MAKE IT EASY TO RETURN</span><h1>Choose a reading moment</h1><p>One genuine page starts a streak. ChessQuest only reminds you on days when you have not read.</p><label htmlFor="onboarding-time">Preferred time</label><Input id="onboarding-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /><div className="onboarding-preview"><Flame /><div><strong>Your first streak begins after page one</strong><p>No imaginary progress and no punishment—just an honest record of showing up.</p></div></div></>}
        </div>
        <footer className="onboarding-actions">
          <Button variant="quiet" disabled={step === 0 || stepLeaving} onClick={() => changeStep(Math.max(0, step - 1))}>Back</Button>
          <div className="onboarding-dots" role="status" aria-label={`Step ${step + 1} of ${stepCount}`}>
            {Array.from({ length: stepCount }, (_, index) => <i key={index} className={index === step ? "active" : index < step ? "complete" : ""} />)}
          </div>
          <Button disabled={stepLeaving || (step === 0 && !name.trim())} onClick={() => step === stepCount - 1 ? onComplete({ name: name.trim(), difficulty, reminderTime: time, goal }) : changeStep(step + 1)}>{step === stepCount - 1 ? "Enter ChessQuest" : "Continue"}<ChevronRight /></Button>
        </footer>
      </section>
    </main>
  );
}
function ChessBoard({
  onSuccess,
  soundStyle,
}: {
  onSuccess: () => void;
  soundStyle: SoundStyle;
}) {
  const [game, setGame] = useState(() => new Chess(lessonFen));
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragging, setDragging] = useState<Square | null>(null);
  const [dropTarget, setDropTarget] = useState<Square | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{
    square: Square;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [lastMove, setLastMove] = useState<{
    from: Square;
    to: Square;
    id: number;
  } | null>(null);
  const [message, setMessage] = useState(
    "Click a piece and its destination, or drag the piece to move it.",
  );

  function attemptMove(from: Square, to: Square) {
    const next = new Chess(game.fen());
    try {
      const move = next.move({ from, to });
      setGame(next);
      setLastMove({ from, to, id: Date.now() });
      playChessSound(
        next.isCheckmate()
          ? "checkmate"
          : next.isCheck()
            ? "check"
            : move.captured
              ? "capture"
              : "move",
        soundStyle,
      );
      if (move.san === "Nxe5") {
        setMessage("Exactly. The knight captures the loose central pawn.");
        onSuccess();
      } else
        setMessage("Legal, but look again: which central piece is undefended?");
    } catch {
      setMessage(
        "That piece cannot move there. Try a square the knight can reach.",
      );
    }
    setSelected(null);
    setDragging(null);
    setDropTarget(null);
  }

  function selectSquare(square: Square) {
    if (suppressClick.current) return;
    if (!selected) {
      if (game.get(square)?.color === "w") setSelected(square);
      return;
    }
    if (selected === square) {
      setSelected(null);
      return;
    }
    attemptMove(selected, square);
  }

  function startDrag(
    event: React.PointerEvent<HTMLSpanElement>,
    square: Square,
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      square,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    setSelected(null);
  }

  function moveDrag(event: React.PointerEvent<HTMLSpanElement>) {
    if (!dragStart.current) return;
    const distance = Math.hypot(
      event.clientX - dragStart.current.x,
      event.clientY - dragStart.current.y,
    );
    if (distance < 6 && !dragStart.current.moved) return;
    dragStart.current.moved = true;
    suppressClick.current = true;
    setDragging(dragStart.current.square);
    setDragPosition({ x: event.clientX, y: event.clientY });
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>("[data-square]")?.dataset.square;
    setDropTarget(target as Square | null);
  }

  function finishDrag(event: React.PointerEvent<HTMLSpanElement>) {
    const start = dragStart.current;
    if (!start) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>("[data-square]")?.dataset.square as
      Square | undefined;
    dragStart.current = null;
    setDragging(null);
    setDropTarget(null);
    if (start.moved && target) attemptMove(start.square, target);
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }

  function reset() {
    setGame(new Chess(lessonFen));
    setSelected(null);
    setDragging(null);
    setDropTarget(null);
    setLastMove(null);
    setMessage("Position reset. Find the undefended piece in the centre.");
  }
  return (
    <div className="board-wrap">
      <div
        className="board"
        role="grid"
        aria-label="Interactive chess position. White to move."
      >
        {game.board().flatMap((rank, r) =>
          rank.map((piece, f) => {
            const square = `${"abcdefgh"[f]}${8 - r}` as Square;
            const isMoving = lastMove?.to === square;
            const moveStyle = isMoving
              ? ({
                  "--move-x": `${"abcdefgh".indexOf(lastMove.from[0]) - f}00%`,
                  "--move-y": `${Number(square[1]) - Number(lastMove.from[1])}00%`,
                } as React.CSSProperties)
              : undefined;
            return (
              <button
                key={square}
                className={`square ${(r + f) % 2 ? "square--dark" : "square--light"} ${selected === square ? "square--selected" : ""} ${dragging === square ? "square--dragging" : ""} ${dropTarget === square ? "square--drop-target" : ""}`}
                onClick={() => selectSquare(square)}
                data-square={square}
                aria-label={`${square}${piece ? `, ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ", empty"}`}
                role="gridcell"
              >
                <span
                  key={`${piece?.color}${piece?.type}-${isMoving ? lastMove.id : 0}`}
                  className={`piece ${piece?.color === "w" ? "piece--draggable" : ""} ${isMoving ? "piece--moving" : ""}`}
                  style={moveStyle}
                  onPointerDown={
                    piece?.color === "w"
                      ? (event) => startDrag(event, square)
                      : undefined
                  }
                  onPointerMove={piece?.color === "w" ? moveDrag : undefined}
                  onPointerUp={piece?.color === "w" ? finishDrag : undefined}
                  onPointerCancel={() => {
                    dragStart.current = null;
                    suppressClick.current = false;
                    setDragging(null);
                    setDropTarget(null);
                  }}
                  aria-hidden="true"
                >
                  {piece ? glyph[`${piece.color}${piece.type}`] : ""}
                </span>
                {f === 0 && <small className="rank-label">{8 - r}</small>}
                {r === 7 && (
                  <small className="file-label">{"abcdefgh"[f]}</small>
                )}
              </button>
            );
          }),
        )}
      </div>
      {dragging && (
        <span
          className="piece-drag-ghost"
          style={{ left: dragPosition.x, top: dragPosition.y }}
          aria-hidden="true"
        >
          {glyph[`w${game.get(dragging)?.type}`]}
        </span>
      )}
      <div className="board-feedback" aria-live="polite">
        <span>{message}</span>
        <Button variant="quiet" onClick={reset}>
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("cq-sidebar") === "collapsed",
  );
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("cq-theme") as Theme) || "light",
  );
  const [complete, setComplete] = useState(
    () => localStorage.getItem("cq-lesson-1") === "done",
  );
  const [hint, setHint] = useState(0);
  const [importedBooks, setImportedBooks] =
    useState<ImportedBook[]>(loadImportedBooks);
  const [readingProgress, setReadingProgress] =
    useState<ReadingProgress>(loadReadingProgress);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [hapticsEnabled, setHapticsEnabled] = useState(
    () => localStorage.getItem("cq-haptics") !== "off",
  );
  const [username, setUsername] = useState(
    () => localStorage.getItem("cq-username") || "",
  );
  const [fontChoice, setFontChoice] = useState<FontChoice>(
    () => (localStorage.getItem("cq-font") as FontChoice) || "nunito",
  );
  const [fontSizeChoice, setFontSizeChoice] = useState<FontSizeChoice>(() => (localStorage.getItem("cq-font-size") as FontSizeChoice) || "comfortable");
  const [colorChoice, setColorChoice] = useState<ColorChoice>(
    () => (localStorage.getItem("cq-color") as ColorChoice) || "forest",
  );
  const [soundStyle, setSoundStyle] = useState<SoundStyle>(
    () => (localStorage.getItem("cq-sounds") as SoundStyle) || "classic",
  );
  const [remindersEnabled, setRemindersEnabled] = useState(
    () => localStorage.getItem("cq-reminders") === "on",
  );
  const [reminderTime, setReminderTime] = useState(
    () => localStorage.getItem("cq-reminder-time") || "19:00",
  );
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => localStorage.getItem("cq-onboarding-complete") !== "yes",
  );
  const [completedGames, setCompletedGames] = useState<SavedGame[]>(loadGames);
  const todayKey = localDateKey();
  const [tipOpen, setTipOpen] = useState(() => localStorage.getItem("cq-tip-seen") !== todayKey);
  const [widgetChoice, setWidgetChoice] = useState(() => localStorage.getItem("cq-widget-choice") || "streak-small");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cq-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.font = fontChoice;
    document.documentElement.dataset.fontSize = fontSizeChoice;
    document.documentElement.dataset.color = colorChoice;
    localStorage.setItem("cq-font", fontChoice);
    localStorage.setItem("cq-font-size", fontSizeChoice);
    localStorage.setItem("cq-color", colorChoice);
    localStorage.setItem("cq-username", username);
    localStorage.setItem("cq-sounds", soundStyle);
  }, [colorChoice, fontChoice, fontSizeChoice, soundStyle, username]);
  useEffect(() => {
    localStorage.setItem(
      "cq-sidebar",
      sidebarCollapsed ? "collapsed" : "expanded",
    );
  }, [sidebarCollapsed]);
  useEffect(() => {
    saveReadingProgress(readingProgress);
  }, [readingProgress]);
  useEffect(() => {
    localStorage.setItem("cq-haptics", hapticsEnabled ? "on" : "off");
  }, [hapticsEnabled]);
  useEffect(() => {
    localStorage.setItem("cq-reminders", remindersEnabled ? "on" : "off");
    localStorage.setItem("cq-reminder-time", reminderTime);
    if (!remindersEnabled) return;
    const check = async () => {
      const today = localDateKey();
      if ((readingProgress.pagesByDate[today] || 0) > 0) return;
      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (current < reminderTime || localStorage.getItem("cq-reminded") === today)
        return;
      try {
        const { isPermissionGranted, sendNotification } = await import(
          "@tauri-apps/plugin-notification"
        );
        if (await isPermissionGranted()) {
          sendNotification({
            title: "Your chess book is waiting",
            body: username
              ? `${username}, five pages keeps your reading streak moving.`
              : "Five pages keeps your reading streak moving.",
          });
          localStorage.setItem("cq-reminded", today);
        }
      } catch {
        // Web previews and unsupported platforms simply skip native reminders.
      }
    };
    void check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [readingProgress.pagesByDate, reminderTime, remindersEnabled, username]);
  function finish() {
    setComplete(true);
    localStorage.setItem("cq-lesson-1", "done");
  }
  const titles: Record<View, string> = {
    home: "Today",
    lesson: "Guided lesson",
    library: "Your library",
    import: "Add a book",
    review: "Review queue",
    club: "Club room",
    settings: "Settings",
    reader: "Reading",
    games: "Play computer",
    widgets: "Widgets",
  };
  const selectedBook = importedBooks.find((book) => book.id === selectedBookId);
  const pagesToday = readingProgress.pagesByDate[localDateKey()] || 0;
  const streak = readingStreak(readingProgress.pagesByDate);
  const streakMilestone = [7, 30, 100, 365].includes(streak);
  const totalPagesRead = Object.values(readingProgress.pagesByBook).reduce(
    (total, pages) => total + pages,
    0,
  );
  useEffect(() => {
    void syncNativeWidget({ choice: widgetChoice, streak, pagesToday }).catch(() => {
      // Web previews and platforms without a configured widget host stay in-app only.
    });
  }, [pagesToday, streak, widgetChoice]);
  const recommendedDifficulty: Difficulty =
    totalPagesRead === 0 && localStorage.getItem("cq-preferred-level")
      ? localStorage.getItem("cq-preferred-level") as Difficulty
      : totalPagesRead >= 100
      ? "club"
      : totalPagesRead >= 25
        ? "casual"
        : "beginner";
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());
  function openBook(book: ImportedBook) {
    setSelectedBookId(book.id);
    setView("reader");
  }
  function completePage(bookId: string, pageNumber: number) {
    setReadingProgress((progress) => recordPage(progress, bookId, pageNumber));
  }
  function addImportedBook(book: ImportedBook) {
    const next = [book, ...importedBooks.filter((item) => item.id !== book.id)];
    setImportedBooks(next);
    saveImportedBooks(next);
    setView("library");
  }
  function removeImportedBook(bookId: string) {
    const next = importedBooks.filter((book) => book.id !== bookId);
    setImportedBooks(next);
    saveImportedBooks(next);
    if (selectedBookId === bookId) setSelectedBookId(null);
  }
  async function toggleReminders() {
    if (remindersEnabled) {
      setRemindersEnabled(false);
      return;
    }
    try {
      const { isPermissionGranted, requestPermission } = await import(
        "@tauri-apps/plugin-notification"
      );
      const granted =
        (await isPermissionGranted()) || (await requestPermission()) === "granted";
      setRemindersEnabled(granted);
    } catch {
      setRemindersEnabled(false);
    }
  }
  function finishOnboarding(profile: { name: string; difficulty: Difficulty; reminderTime: string; goal: string }) {
    setUsername(profile.name);
    setReminderTime(profile.reminderTime);
    localStorage.setItem("cq-preferred-level", profile.difficulty);
    localStorage.setItem("cq-learning-goal", profile.goal);
    localStorage.setItem("cq-onboarding-complete", "yes");
    setOnboardingOpen(false);
  }
  function toggleTheme(event?: React.MouseEvent<HTMLElement>) {
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;
    document.documentElement.style.setProperty("--theme-ripple-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-ripple-y", `${y}px`);
    const next = theme === "light" ? "dark" : "light";
    const transition = (document as Document & { startViewTransition?: (callback: () => void) => { ready: Promise<void> } }).startViewTransition;
    if (!transition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(next);
      return;
    }
    transition.call(document, () => flushSync(() => setTheme(next)));
  }
  if (onboardingOpen) return <Onboarding initialName={username} onComplete={finishOnboarding} />;
  const dailyTip = tipForDay();
  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "app-shell--collapsed" : ""}`}
    >
      <aside
        className={`sidebar ${sidebarCollapsed ? "sidebar--collapsed" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="sidebar-header">
          <button
            className="brand"
            onClick={() => setView("home")}
            aria-label="ChessQuest home"
          >
            <img className="brand-mark" src="/chessquest-logo.png" alt="" />
            <span className="brand-copy">
              <strong>ChessQuest</strong>
              <small>Read. Move. Remember.</small>
            </span>
          </button>
          <button
            className="collapse-button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        </div>
        <nav>
          <Nav
            active={view === "home"}
            onClick={() => setView("home")}
            icon={<CalendarDays />}
            label="Today"
          />
          <Nav
            active={view === "library"}
            onClick={() => setView("library")}
            icon={<Library />}
            label="Library"
          />
          <Nav
            active={view === "import"}
            onClick={() => setView("import")}
            icon={<BookPlus />}
            label="Add book"
          />
          <Nav
            active={view === "review"}
            onClick={() => setView("review")}
            icon={<Target />}
            label="Review"
          />
          <Nav
            active={view === "games"}
            onClick={() => setView("games")}
            icon={<Gamepad2 />}
            label="Play computer"
          />
          <Nav
            active={view === "club"}
            onClick={() => setView("club")}
            icon={<Users />}
            label="Club room"
          />
          <Nav
            active={view === "widgets"}
            onClick={() => setView("widgets")}
            icon={<LayoutGrid />}
            label="Widgets"
          />
        </nav>
        <div className="sidebar-foot">
          <AppUpdater />
          <div
            className={`streak ${pagesToday ? "streak--active" : ""} ${streakMilestone ? "streak--milestone" : ""}`}
          >
            <Flame />
            <span>
              <strong>
                {streak} day{streak === 1 ? "" : "s"} reading
              </strong>
              <small>
                {pagesToday
                  ? `${pagesToday} page${pagesToday === 1 ? "" : "s"} today`
                  : "Read a page to begin"}
              </small>
            </span>
          </div>
          <Button
            variant="quiet"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          >
            {theme === "light" ? <Moon /> : <Sun />}
            {theme === "light" ? "Dark" : "Light"} theme
          </Button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              {dateLabel} · {pagesToday} page{pagesToday === 1 ? "" : "s"} read
            </span>
            <h1>{titles[view]}</h1>
          </div>
          <Button
            variant={view === "settings" ? "outline" : "quiet"}
            className="settings-button"
            onClick={() => setView("settings")}
            aria-current={view === "settings" ? "page" : undefined}
          >
            <Settings aria-hidden="true" />
            <span>Settings</span>
          </Button>
        </header>
        {view === "home" && (
          <Home
            books={importedBooks}
            progress={readingProgress}
            onRead={openBook}
            onImport={() => setView("import")}
            widgetChoice={widgetChoice}
          />
        )}{" "}
        {view === "lesson" && (
          <Lesson
            complete={complete}
            hint={hint}
            onHint={() => setHint((v) => Math.min(2, v + 1))}
            onSuccess={finish}
            onExit={() => setView("home")}
            soundStyle={soundStyle}
            username={username}
          />
        )}{" "}
        {view === "library" && (
          <LibraryView
            onRead={openBook}
            onImport={() => setView("import")}
            importedBooks={importedBooks}
            progress={readingProgress}
            onRemove={removeImportedBook}
          />
        )}{" "}
        {view === "import" && (
          <BookImporter
            onImported={addImportedBook}
            onCancel={() => setView("library")}
          />
        )}{" "}
        {view === "review" && <GameReview games={completedGames} books={importedBooks} />}{" "}
        {view === "club" && <Club />}
        {view === "widgets" && <WidgetGallery selected={widgetChoice} onSelect={(value) => { setWidgetChoice(value); localStorage.setItem("cq-widget-choice", value); }} streak={streak} pagesToday={pagesToday} />}
        {view === "settings" && (
          <SettingsView
            theme={theme}
            onThemeChange={toggleTheme}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarChange={() => setSidebarCollapsed((value) => !value)}
            hapticsEnabled={hapticsEnabled}
            onHapticsChange={() => setHapticsEnabled((value) => !value)}
            username={username}
            onUsernameChange={setUsername}
            fontChoice={fontChoice}
            onFontChange={setFontChoice}
            fontSizeChoice={fontSizeChoice}
            onFontSizeChange={setFontSizeChoice}
            colorChoice={colorChoice}
            onColorChange={setColorChoice}
            soundStyle={soundStyle}
            onSoundChange={setSoundStyle}
            remindersEnabled={remindersEnabled}
            onReminderToggle={() => void toggleReminders()}
            reminderTime={reminderTime}
            onReminderTimeChange={setReminderTime}
          />
        )}
        {view === "reader" && selectedBook && (
          <Reader
            book={selectedBook}
            pagesRead={readingProgress.pagesByBook[selectedBook.id] || 0}
            onPageRead={(page) => completePage(selectedBook.id, page)}
            onExit={() => setView("library")}
            hapticsEnabled={hapticsEnabled}
            soundStyle={soundStyle}
            pagesToday={pagesToday}
          />
        )}
        {view === "games" && (
          <ComputerGame
            name={username || "Chess reader"}
            recommended={recommendedDifficulty}
            sounds={soundStyle !== "silent"}
            onSound={(kind) => playChessSound(kind, soundStyle)}
            onGameSaved={setCompletedGames}
            onReviewRequested={() => setView("review")}
          />
        )}
      </main>
      <Dialog open={tipOpen} onOpenChange={(open) => { setTipOpen(open); if (!open) localStorage.setItem("cq-tip-seen", todayKey); }}>
        <DialogContent className="tip-dialog">
          <DialogHeader><span className="eyebrow">TIP {dailyTip.number} OF 365</span><DialogTitle>{dailyTip.title}</DialogTitle><DialogDescription>{dailyTip.body}</DialogDescription></DialogHeader>
          <div className="tip-practice"><Target /><div><strong>Try it today</strong><p>{dailyTip.practice}</p></div></div>
          <DialogFooter><Button onClick={() => { setTipOpen(false); localStorage.setItem("cq-tip-seen", todayKey); }}>Start learning</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function SettingsView({
  theme,
  onThemeChange,
  sidebarCollapsed,
  onSidebarChange,
  hapticsEnabled,
  onHapticsChange,
  username,
  onUsernameChange,
  fontChoice,
  onFontChange,
  fontSizeChoice,
  onFontSizeChange,
  colorChoice,
  onColorChange,
  soundStyle,
  onSoundChange,
  remindersEnabled,
  onReminderToggle,
  reminderTime,
  onReminderTimeChange,
}: {
  theme: Theme;
  onThemeChange: (event: React.MouseEvent<HTMLButtonElement>) => void;
  sidebarCollapsed: boolean;
  onSidebarChange: () => void;
  hapticsEnabled: boolean;
  onHapticsChange: () => void;
  username: string;
  onUsernameChange: (value: string) => void;
  fontChoice: FontChoice;
  onFontChange: (value: FontChoice) => void;
  fontSizeChoice: FontSizeChoice;
  onFontSizeChange: (value: FontSizeChoice) => void;
  colorChoice: ColorChoice;
  onColorChange: (value: ColorChoice) => void;
  soundStyle: SoundStyle;
  onSoundChange: (value: SoundStyle) => void;
  remindersEnabled: boolean;
  onReminderToggle: () => void;
  reminderTime: string;
  onReminderTimeChange: (value: string) => void;
}) {
  return (
    <div className="settings-page mount">
      <section className="card settings-card">
        <div>
          <span className="eyebrow">Appearance</span>
          <h2>Make ChessQuest feel comfortable</h2>
          <p>These preferences stay on this device.</p>
        </div>
        <div className="setting-row">
          <div>
            <strong>Color theme</strong>
            <small>Currently using {theme} mode</small>
          </div>
          <Button variant="outline" onClick={onThemeChange}>
            {theme === "light" ? <Moon /> : <Sun />}
            Use {theme === "light" ? "dark" : "light"} mode
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="username"><strong>Your name</strong></label>
            <small>Used in exercises and computer-game encouragement.</small>
          </div>
          <Input
            id="username"
            className="setting-control"
            value={username}
            maxLength={32}
            autoComplete="name"
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="font-choice"><strong>Font family</strong></label>
            <small>Nunito Sans is the new reading-friendly default.</small>
          </div>
          <Select value={fontChoice} onValueChange={(value) => onFontChange(value as FontChoice)}><SelectTrigger id="font-choice" className="setting-control"><SelectValue>{({ nunito: "Nunito Sans", geist: "Geist", serif: "Classic serif", system: "System UI", verdana: "Verdana", mono: "Monospace" } as Record<FontChoice, string>)[fontChoice]}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="nunito">Nunito Sans</SelectItem><SelectItem value="geist">Geist</SelectItem><SelectItem value="serif">Classic serif</SelectItem><SelectItem value="system">System UI</SelectItem><SelectItem value="verdana">Verdana</SelectItem><SelectItem value="mono">Monospace</SelectItem></SelectGroup></SelectContent></Select>
        </div>
        <div className="setting-row">
          <div><label htmlFor="font-size-choice"><strong>Font size</strong></label><small>Scales reading and interface text across the application.</small></div>
          <Select value={fontSizeChoice} onValueChange={(value) => onFontSizeChange(value as FontSizeChoice)}><SelectTrigger id="font-size-choice" className="setting-control"><SelectValue>{fontSizeChoice[0].toUpperCase() + fontSizeChoice.slice(1)}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="compact">Compact</SelectItem><SelectItem value="comfortable">Comfortable</SelectItem><SelectItem value="large">Large</SelectItem></SelectGroup></SelectContent></Select>
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="color-choice"><strong>App color</strong></label>
            <small>Changes primary actions and highlights.</small>
          </div>
          <Select value={colorChoice} onValueChange={(value) => onColorChange(value as ColorChoice)}><SelectTrigger id="color-choice" className="setting-control"><SelectValue>{colorChoice[0].toUpperCase() + colorChoice.slice(1)}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="forest">Forest</SelectItem><SelectItem value="ocean">Ocean</SelectItem><SelectItem value="plum">Plum</SelectItem><SelectItem value="ember">Ember</SelectItem></SelectGroup></SelectContent></Select>
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="sound-choice"><strong>Chess sounds</strong></label>
            <small>Choose the character of move and capture feedback.</small>
          </div>
          <Select value={soundStyle} onValueChange={(value) => onSoundChange(value as SoundStyle)}><SelectTrigger id="sound-choice" className="setting-control"><SelectValue>{soundStyle === "classic" ? "Classic board" : soundStyle === "soft" ? "Soft focus" : "Silent"}</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="classic">Classic board</SelectItem><SelectItem value="soft">Soft focus</SelectItem><SelectItem value="silent">Silent</SelectItem></SelectGroup></SelectContent></Select>
        </div>
        <div className="setting-row">
          <div>
            <strong>Celebration haptics</strong>
            <small>
              {"vibrate" in navigator
                ? `Currently ${hapticsEnabled ? "enabled" : "disabled"}`
                : "Not supported on this device"}
            </small>
          </div>
          <Button
            variant="outline"
            onClick={onHapticsChange}
            disabled={!("vibrate" in navigator)}
          >
            Turn {hapticsEnabled ? "off" : "on"}
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <strong>Daily reading reminder</strong>
            <small>{remindersEnabled ? `Scheduled for ${reminderTime}` : "Off"}</small>
          </div>
          <div className="setting-inline">
            <Input aria-label="Reminder time" className="setting-control" type="time" value={reminderTime} onChange={(event) => onReminderTimeChange(event.target.value)} />
            <Button variant="outline" onClick={onReminderToggle}>{remindersEnabled ? "Turn off" : "Enable"}</Button>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <strong>Sidebar</strong>
            <small>
              Currently {sidebarCollapsed ? "collapsed" : "expanded"}
            </small>
          </div>
          <Button variant="outline" onClick={onSidebarChange}>
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {sidebarCollapsed ? "Expand" : "Collapse"}
          </Button>
        </div>
      </section>
    </div>
  );
}
function Nav({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
  badge?: string;
}) {
  return (
    <button
      className={`nav-button ${active ? "nav-button--active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      {icon}
      <span>{label}</span>
      {badge && <b>{badge}</b>}
    </button>
  );
}
function Home({
  books,
  progress,
  onRead,
  onImport,
  widgetChoice,
}: {
  books: ImportedBook[];
  progress: ReadingProgress;
  onRead: (book: ImportedBook) => void;
  onImport: () => void;
  widgetChoice: string;
}) {
  const activeBook =
    books.find((book) => book.id === progress.lastBookId) || books[0];
  const pagesRead = activeBook ? progress.pagesByBook[activeBook.id] || 0 : 0;
  const totalPages = activeBook?.chapters.length || 0;
  const percent = totalPages
    ? Math.min(100, Math.round((pagesRead / totalPages) * 100))
    : 0;
  const pagesToday = progress.pagesByDate[localDateKey()] || 0;
  const currentStreak = readingStreak(progress.pagesByDate);
  const trend = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const key = localDateKey(date);
    return { label: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date), value: progress.pagesByDate[key] || 0 };
  });
  const trendMax = Math.max(1, ...trend.map((day) => day.value));
  return (
    <div className="content-grid mount">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="pill">
            {activeBook ? "CONTINUE READING" : "YOUR READING LIBRARY"}
          </span>
          <h2>
            {activeBook ? activeBook.title : "Start with a real chess book"}
          </h2>
          <p>
            {activeBook
              ? `${pagesRead} of ${totalPages} pages completed. Read five at a time and watch the book become finishable.`
              : "Add an EPUB you own. ChessQuest will turn its actual chapters into short reading pages stored on this device."}
          </p>
          <div className="hero-actions">
            <Button
              onClick={() => (activeBook ? onRead(activeBook) : onImport())}
            >
              {activeBook ? "Continue reading" : "Add your first book"}
              <ChevronRight />
            </Button>
            <span>
              {activeBook ? `${percent}% complete` : "Private · Works offline"}
            </span>
          </div>
        </div>
        <div className="mini-board" aria-hidden="true">
          {Array.from({ length: 64 }, (_, i) => (
            <i key={i}>{i === 28 ? "♟" : i === 45 ? "♘" : ""}</i>
          ))}
        </div>
      </section>
      <section className="journey card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Actual progress</span>
            <h2>{activeBook ? activeBook.title : "No book added yet"}</h2>
          </div>
          <strong>{percent}%</strong>
        </div>
        <Progress value={percent} label="Book reading progress" />
        <p className="progress-copy">
          {activeBook
            ? `${Math.max(0, totalPages - pagesRead)} pages remain. Progress changes only when you finish a real page.`
            : "Your progress begins at zero and grows only from pages you read."}
        </p>
        <div className="reading-trend" aria-label="Pages read during the last seven days">
          <div><strong>Seven-day reading trend</strong><span>{trend.reduce((sum, day) => sum + day.value, 0)} pages</span></div>
          <div className="reading-trend-bars">{trend.map((day, index) => <div key={`${day.label}-${index}`}><i style={{ height: `${Math.max(day.value ? 14 : 3, (day.value / trendMax) * 100)}%` }} /><span>{day.label}</span><small>{day.value}</small></div>)}</div>
        </div>
      </section>
      <aside className="side-stack">
        <section className="card compact">
          <span className="eyebrow">Read today</span>
          <div className="metric">
            <strong>{pagesToday}</strong>
            <span>
              real page{pagesToday === 1 ? "" : "s"}
              <br />
              completed today
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => (activeBook ? onRead(activeBook) : onImport())}
          >
            {activeBook ? "Read next page" : "Add a book"}
          </Button>
        </section>
        <WidgetPreview id={widgetChoice} streak={currentStreak} pagesToday={pagesToday} compact />
        {currentStreak === 0 && (
          <section className="streak-intro card compact">
            <span className="eyebrow">What is a reading streak?</span>
            <h3>One real page keeps the flame alive</h3>
            <p>Read on consecutive days and your streak grows. Missing today does not erase what you learned—it simply starts a new run next time.</p>
          </section>
        )}
      </aside>
    </div>
  );
}
const widgetOptions = [
  { id: "streak-small", name: "Streak flame", size: "Small" },
  { id: "today-small", name: "Today’s page", size: "Small" },
  { id: "streak-medium", name: "Streak journey", size: "Medium" },
  { id: "reading-medium", name: "Reading nudge", size: "Medium" },
  { id: "puzzle-medium", name: "Daily position", size: "Medium" },
  { id: "dashboard-large", name: "Learning dashboard", size: "Large" },
];
function WidgetPreview({ id, streak, pagesToday, compact = false }: { id: string; streak: number; pagesToday: number; compact?: boolean }) {
  const option = widgetOptions.find((item) => item.id === id) || widgetOptions[0];
  const kind = id.split("-")[0];
  return <section className={`widget-preview widget-preview--${option.size.toLowerCase()} ${compact ? "widget-preview--compact card" : ""}`}>
    <div className="widget-preview-head"><img src="/chessquest-logo.png" alt="" /><span>ChessQuest</span></div>
    {kind === "streak" && <div className="widget-preview-main"><Flame /><strong>{streak}</strong><span>day streak</span><small>{pagesToday ? "Today complete" : "One page keeps it alive"}</small></div>}
    {kind === "today" && <div className="widget-preview-main"><BookPlus /><strong>{pagesToday}</strong><span>pages today</span><small>{pagesToday ? "Keep going" : "Your book is waiting"}</small></div>}
    {kind === "reading" && <div className="widget-preview-main"><Library /><strong>5 more?</strong><span>Small sessions finish books.</span><small>Open ChessQuest to continue</small></div>}
    {kind === "puzzle" && <div className="widget-preview-main"><Target /><strong>♞ → ?</strong><span>Find today’s best move</span><small>Tap to solve</small></div>}
    {kind === "dashboard" && <><div className="widget-preview-main"><Flame /><strong>{streak} days</strong><span>{pagesToday} pages today</span></div><div className="widget-bars"><i /><i /><i /><i /><i /></div><small>Read · Review · Play</small></>}
  </section>;
}
function WidgetGallery({ selected, onSelect, streak, pagesToday }: { selected: string; onSelect: (value: string) => void; streak: number; pagesToday: number }) {
  const initial = Math.max(0, widgetOptions.findIndex((item) => item.id === selected));
  const [index, setIndex] = useState(initial);
  const [nativeStatus, setNativeStatus] = useState<"idle" | "syncing" | "ready" | "web" | "error">("idle");
  const option = widgetOptions[index];
  function move(direction: number) { setIndex((value) => (value + direction + widgetOptions.length) % widgetOptions.length); }
  async function addToDevice() {
    setNativeStatus("syncing");
    try {
      onSelect(option.id);
      const desktopFallback = /Win|Linux/i.test(navigator.platform);
      const result = desktopFallback
        ? await openDesktopWidget({ choice: option.id, streak, pagesToday }).then(() => ({ available: true }))
        : await makeNativeWidgetAvailable({ choice: option.id, streak, pagesToday });
      setNativeStatus(result.available ? "ready" : "web");
    } catch {
      setNativeStatus("error");
    }
  }
  return <div className="widget-gallery mount">
    <section className="widget-gallery-copy"><span className="eyebrow">OS WIDGET GALLERY</span><h2>Keep chess within sight</h2><p>Choose the ChessQuest widget that appears in your device’s widget gallery. Real reading and streak data stays synchronized from this app.</p><div className="widget-size-pill">{option.size}</div><h3>{option.name}</h3><p>{option.size === "Small" ? "A single focused signal." : option.size === "Medium" ? "More context without taking over your day." : "Your reading and practice rhythm in one view."}</p><div className="widget-install-actions"><Button variant="outline" onClick={() => onSelect(option.id)}>{selected === option.id ? <Check /> : <LayoutGrid />}{selected === option.id ? "Selected in ChessQuest" : "Use in ChessQuest"}</Button><Button onClick={() => void addToDevice()} disabled={nativeStatus === "syncing"}><LayoutGrid />{nativeStatus === "syncing" ? "Preparing widget…" : "Add to device widgets"}</Button></div>{nativeStatus !== "idle" && <p className={`widget-native-status widget-native-status--${nativeStatus}`} role="status">{nativeStatus === "ready" ? "Widget data is ready. On macOS, open Edit Widgets and choose ChessQuest. Android will offer to pin it when supported; Windows and Linux open a persistent desktop widget." : nativeStatus === "web" ? "Install the ChessQuest app first to add an operating-system widget." : nativeStatus === "error" ? "The device widget could not be prepared. Check the installed app permissions and try again." : "Preparing the native widget…"}</p>}</section>
    <section className="widget-carousel" aria-roledescription="carousel" aria-label="Widget previews">
      <div className="widget-device"><div className="widget-device-time">9:41</div><WidgetPreview key={option.id} id={option.id} streak={streak} pagesToday={pagesToday} /></div>
      <div className="widget-carousel-controls"><button aria-label="Previous widget" onClick={() => move(-1)}><ChevronLeft /></button><div>{widgetOptions.map((item, dot) => <button key={item.id} aria-label={`Show ${item.name}`} aria-current={dot === index ? "true" : undefined} className={dot === index ? "active" : ""} onClick={() => setIndex(dot)} />)}</div><button aria-label="Next widget" onClick={() => move(1)}><ChevronRight /></button></div>
    </section>
  </div>;
}
function Lesson({
  complete,
  hint,
  onHint,
  onSuccess,
  onExit,
  soundStyle,
  username,
}: {
  complete: boolean;
  hint: number;
  onHint: () => void;
  onSuccess: () => void;
  onExit: () => void;
  soundStyle: SoundStyle;
  username: string;
}) {
  return (
    <div className="lesson mount">
      <div className="lesson-head">
        <Button variant="quiet" onClick={onExit}>
          ← Save & exit
        </Button>
        <div>
          <span>
            {complete ? "Position completed" : "Position in progress"}
          </span>
          <Progress value={complete ? 100 : 0} label="Lesson completion" />
        </div>
      </div>
      <div className="lesson-grid">
        <section className="lesson-copy">
          <span className="pill">YOUR TURN · WHITE TO MOVE</span>
          <h2>
            {username ? `${username}, find` : "Find"} the piece that has no
            defender
          </h2>
          <p>
            Black placed a pawn in the centre with <strong>…e5</strong>. Before
            choosing a move, ask the most useful beginner question:
          </p>
          <blockquote>“Is anything undefended?”</blockquote>
          <p>
            Move the white knight to capture Black’s loose pawn. Commit to your
            answer on the board.
          </p>
          <div className="hint-box">
            <div>
              <CircleHelp />
              <strong>Need a nudge?</strong>
            </div>
            <p>
              {hint === 0
                ? "Hints become more specific one step at a time."
                : hint === 1
                  ? "The knight on f3 can reach the centre."
                  : "Look at the black pawn on e5."}
            </p>
            <Button variant="outline" onClick={onHint} disabled={hint === 2}>
              Reveal hint {Math.min(hint + 1, 2)} of 2
            </Button>
          </div>
          {complete && (
            <div className="success" role="status">
              <Check />
              <div>
                <strong>Position complete</strong>
                <p>Saved to your review queue.</p>
              </div>
            </div>
          )}
        </section>
        <ChessBoard onSuccess={onSuccess} soundStyle={soundStyle} />
      </div>
    </div>
  );
}
function LibraryView({
  onRead,
  onImport,
  importedBooks,
  progress,
  onRemove,
}: {
  onRead: (book: ImportedBook) => void;
  onImport: () => void;
  importedBooks: ImportedBook[];
  progress: ReadingProgress;
  onRemove: (bookId: string) => void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  return (
    <div className="library-list mount">
      <div className="library-toolbar">
        <div>
          <span className="eyebrow">{importedBooks.length} books</span>
          <h2>Your learning library</h2>
        </div>
        <Button onClick={onImport}>
          <BookPlus aria-hidden="true" />
          Add new book
        </Button>
      </div>
      {!importedBooks.length && (
        <section className="empty-card card">
          <BookPlus aria-hidden="true" />
          <span className="pill">LIBRARY EMPTY</span>
          <h2>Add a book you actually want to finish</h2>
          <p>No sample books or invented progress are shown here.</p>
          <Button onClick={onImport}>Choose an EPUB</Button>
        </section>
      )}
      {importedBooks.map((b) => (
        <article className="book-card card" key={b.id}>
          <div className="book-cover book-cover--imported">
            <span className="book-cover-mark" aria-hidden="true">♞</span>
            <strong>{b.title}</strong>
            <small>{b.author}</small>
          </div>
          <div>
            <span className="pill">Your imported book</span>
            <h2>{b.title}</h2>
            <p>
              {b.author} · {b.chapters.length} reading pages
            </p>
            <Progress
              value={Math.min(
                100,
                Math.round(
                  ((progress.pagesByBook[b.id] || 0) / b.chapters.length) * 100,
                ),
              )}
              label={`${b.title} progress`}
            />
            <small>
              {progress.pagesByBook[b.id] || 0} of {b.chapters.length} pages
              read
            </small>
          </div>
          <div className="book-actions">
            {removingId === b.id ? <><span>Remove this book from this device?</span><Button variant="outline" onClick={() => setRemovingId(null)}>Keep</Button><Button onClick={() => { onRemove(b.id); setRemovingId(null); }}>Remove</Button></> : <><Button variant="quiet" aria-label={`Remove ${b.title}`} onClick={() => setRemovingId(b.id)}><Trash2 /> Remove</Button><Button variant="outline" onClick={() => onRead(b)}>{progress.pagesByBook[b.id] ? "Continue reading" : "Start reading"}</Button></>}
          </div>
        </article>
      ))}
    </div>
  );
}

function readingParagraphs(text: string) {
  const sentences = text.match(/[^.!?]+(?:[.!?]+[”’"']?|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [text];
  if (sentences.length < 3) return [text];
  const paragraphs: string[] = [];
  let paragraph = "";
  for (const sentence of sentences) {
    if (paragraph && paragraph.length + sentence.length > 430) {
      paragraphs.push(paragraph);
      paragraph = sentence;
    } else {
      paragraph = paragraph ? `${paragraph} ${sentence}` : sentence;
    }
  }
  if (paragraph) paragraphs.push(paragraph);
  return paragraphs;
}

function Reader({
  book,
  pagesRead,
  onPageRead,
  onExit,
  hapticsEnabled,
  soundStyle,
  pagesToday,
}: {
  book: ImportedBook;
  pagesRead: number;
  onPageRead: (pageNumber: number) => void;
  onExit: () => void;
  hapticsEnabled: boolean;
  soundStyle: SoundStyle;
  pagesToday: number;
}) {
  const [pageIndex, setPageIndex] = useState(
    Math.min(pagesRead, Math.max(0, book.chapters.length - 1)),
  );
  const [checkpoint, setCheckpoint] = useState<number | null>(null);
  const flipStageRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const complete = pagesRead >= book.chapters.length;
  const displayedProgress = Math.max(pagesRead, pageIndex);
  const percent = Math.min(
    100,
    Math.round((displayedProgress / book.chapters.length) * 100),
  );

  useEffect(() => {
    const stage = flipStageRef.current;
    if (!stage || checkpoint !== null || complete) return;
    const host = document.createElement("div");
    host.className = "reader-flip-book";
    stage.replaceChildren(host);

    book.chapters.forEach((chapter, chapterIndex) => {
      const chapterTitleParts = chapter.title.split(/\s+·\s+/);
      const sheet = document.createElement("section");
      sheet.className = "reader-flip-page";
      const runningHead = document.createElement("header");
      runningHead.className = "reader-running-head";
      const bookName = document.createElement("span");
      bookName.textContent = book.title;
      const author = document.createElement("span");
      author.textContent = book.author;
      runningHead.append(bookName, author);
      const scroll = document.createElement("div");
      scroll.className = "reader-page-scroll";
      const titleBlock = document.createElement("div");
      titleBlock.className = "reader-title-block";
      const eyebrow = document.createElement("span");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = chapterTitleParts[1] ? `SECTION · ${chapterTitleParts[1]}` : "CURRENT SECTION";
      const heading = document.createElement("h2");
      heading.textContent = chapterTitleParts[0];
      const ornament = document.createElement("div");
      ornament.className = "reader-ornament";
      ornament.setAttribute("aria-hidden", "true");
      ornament.innerHTML = "<i></i><span>♞</span><i></i>";
      titleBlock.append(eyebrow, heading, ornament);
      const prose = document.createElement("div");
      prose.className = "reader-prose";
      readingParagraphs(chapter.excerpt).forEach((copy) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = copy;
        prose.append(paragraph);
      });
      scroll.append(titleBlock, prose);
      const folio = document.createElement("footer");
      folio.className = "reader-folio";
      folio.setAttribute("aria-label", `Book page ${chapterIndex + 1}`);
      const pageNumber = document.createElement("span");
      pageNumber.textContent = String(chapterIndex + 1);
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
      startPage: pageIndex,
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
    flipBook.on("flip", (event) => setPageIndex(event.data));
    pageFlipRef.current = flipBook;
    return () => {
      pageFlipRef.current = null;
      flipBook.destroy();
      stage.replaceChildren();
    };
  }, [book, checkpoint, complete]);

  function finishPage() {
    const nextPage = pageIndex + 1;
    const alreadyRead = nextPage <= pagesRead;
    if (alreadyRead) {
      pageFlipRef.current?.flipNext("top");
      return;
    }
    onPageRead(nextPage);
    const celebratesStreak = pagesToday === 0 || nextPage % 5 === 0 || nextPage === book.chapters.length;
    if (celebratesStreak) {
      setCheckpoint(nextPage);
      playStreakCelebration(soundStyle);
      if (hapticsEnabled && "vibrate" in navigator)
        navigator.vibrate([30, 35, 55, 45, 90]);
    } else {
      pageFlipRef.current?.flipNext("top");
    }
  }

  function previousPage() {
    pageFlipRef.current?.flipPrev("top");
  }

  if (complete && checkpoint === null)
    return (
      <section className="reader-complete card mount">
        <Flame aria-hidden="true" />
        <span className="pill">BOOK COMPLETE</span>
        <h2>You finished {book.title}</h2>
        <p>Every recorded page came from your own reading.</p>
        <Button onClick={onExit}>Back to library</Button>
      </section>
    );

  if (checkpoint !== null) {
    const bookFinished = checkpoint >= book.chapters.length;
    const fivePageCheckpoint = checkpoint % 5 === 0;
    return (
      <section className="reading-checkpoint card mount" aria-live="polite">
        <div className="checkpoint-flame" aria-hidden="true">
          <Flame />
          <i /><i /><i /><i /><i /><i />
        </div>
        <span className="pill">
          {bookFinished ? "BOOK FINISHED" : `${checkpoint} PAGES READ`}
        </span>
        <h2>
          {bookFinished
            ? `You finished ${book.title}`
            : fivePageCheckpoint
              ? "That was five. Want five more?"
              : "Your reading streak is alive."}
        </h2>
        <p>
          {bookFinished
            ? "The progress is real—and the whole book is behind you."
            : fivePageCheckpoint
              ? `${book.chapters.length - checkpoint} pages remain. You only need to choose the next five.`
              : "You showed up today. Keep the momentum or leave with your progress safely recorded."}
        </p>
        <div className="checkpoint-actions">
          {!bookFinished && (
            <Button
              onClick={() => {
                setPageIndex(checkpoint);
                setCheckpoint(null);
              }}
            >
              {fivePageCheckpoint ? "Yes, five more pages" : "Keep reading"}
              <ChevronRight />
            </Button>
          )}
          <Button variant="outline" onClick={onExit}>
            {bookFinished ? "Back to library" : "Stop here for now"}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <article className="reader-page mount">
      <header className="reader-toolbar">
        <Button variant="quiet" onClick={onExit}>
          <ArrowLeft aria-hidden="true" />
          Save & exit
        </Button>
        <div>
          <span>
            Page {pageIndex + 1} of {book.chapters.length}
          </span>
          <Progress value={percent} label={`${book.title} reading progress`} />
        </div>
      </header>
      <div className="reader-flip-shell" aria-label={`${book.title} interactive HTML book`}>
        <div className="reader-flip-stage" ref={flipStageRef} />
      </div>
      <footer className="reader-next">
        <span>This page counts only when you finish it.</span>
        <div className="reader-page-controls">
          <Button variant="outline" onClick={previousPage} disabled={pageIndex === 0}>
            <ChevronLeft /> Previous page
          </Button>
          <Button onClick={finishPage}>
            {pageIndex < pagesRead ? "Next page" : "Mark page read"}
            <ChevronRight />
          </Button>
        </div>
      </footer>
    </article>
  );
}
function Club() {
  const [minutes, setMinutes] = useState("10");
  const [increment, setIncrement] = useState("0");
  const [challengeUrl, setChallengeUrl] = useState("");
  const [clubStatus, setClubStatus] = useState<"idle" | "creating" | "error">("idle");
  async function createChallenge() {
    setClubStatus("creating");
    try {
      const body = new URLSearchParams({ "clock.limit": String(Number(minutes) * 60), "clock.increment": increment, variant: "standard", name: "ChessQuest Club Room" });
      const response = await fetch("https://lichess.org/api/challenge/open", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!response.ok) throw new Error("challenge failed");
      const result = await response.json() as { url?: string; challenge?: { url?: string } };
      const url = result.url || result.challenge?.url;
      if (!url) throw new Error("challenge missing");
      setChallengeUrl(url);
      setClubStatus("idle");
    } catch {
      setClubStatus("error");
    }
  }
  return (
    <div className="club-online mount"><section className="card club-create"><Swords aria-hidden="true" /><span className="pill">REAL ONLINE MATCH</span><h2>Create a club challenge</h2><p>ChessQuest uses Lichess’s official open-challenge service. Share the invite; the first two people who open it are paired online. No ChessQuest account or invented opponent is involved.</p><div className="club-controls"><label>Minutes per player<Select value={minutes} onValueChange={(value) => setMinutes(value || "10")}><SelectTrigger><SelectValue>{minutes} minutes</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="3">3 minutes</SelectItem><SelectItem value="5">5 minutes</SelectItem><SelectItem value="10">10 minutes</SelectItem><SelectItem value="30">30 minutes</SelectItem></SelectGroup></SelectContent></Select></label><label>Increment<Select value={increment} onValueChange={(value) => setIncrement(value || "0")}><SelectTrigger><SelectValue>{increment} seconds</SelectValue></SelectTrigger><SelectContent><SelectGroup><SelectItem value="0">No increment</SelectItem><SelectItem value="2">2 seconds</SelectItem><SelectItem value="5">5 seconds</SelectItem><SelectItem value="10">10 seconds</SelectItem></SelectGroup></SelectContent></Select></label></div><Button onClick={() => void createChallenge()} disabled={clubStatus === "creating"}>{clubStatus === "creating" ? "Creating secure invite…" : "Create online match"}</Button>{clubStatus === "error" && <p className="club-error" role="alert">The challenge service could not be reached. Check your connection and try again.</p>}</section>{challengeUrl && <section className="card club-invite" aria-live="polite"><span className="eyebrow">INVITE READY</span><h2>Send this to your opponent</h2><a href={challengeUrl} target="_blank" rel="noreferrer">{challengeUrl}</a><div><Button variant="outline" onClick={() => void navigator.clipboard.writeText(challengeUrl)}><Copy /> Copy invite</Button><a className="button button--primary" href={challengeUrl} target="_blank" rel="noreferrer">Join match <ExternalLink /></a></div><small>The live board, clocks, fair-play controls, and matchmaking are operated by Lichess.</small></section>}</div>
  );
}
