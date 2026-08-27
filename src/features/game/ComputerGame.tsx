import { useEffect, useRef, useState } from "react";
import { ChevronRight, Eye, Flag, Gauge, GraduationCap, RotateCcw, ScanSearch } from "lucide-react";
import { Chess, type Move, type Square } from "chess.js";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveGame, type SavedGame } from "./review";
import {
  chooseComputerMove,
  computerThinkDelay,
  reactionFor,
  type Difficulty,
} from "./engine";

const pieces: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

export type GameSpeed = "bullet" | "blitz" | "rapid" | "classical";
type GameMode = "play" | "watch" | "rating";
const secondsBySpeed: Record<GameSpeed, number> = {
  bullet: 60,
  blitz: 300,
  rapid: 600,
  classical: 1800,
};

type Props = {
  name: string;
  recommended: Difficulty;
  sounds: boolean;
  onSound: (kind: "move" | "capture" | "check" | "checkmate") => void;
  onGameSaved?: (games: SavedGame[]) => void;
  onReviewRequested?: () => void;
};

export function ComputerGame({ name, recommended, sounds, onSound, onGameSaved, onReviewRequested }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(recommended);
  const [speed, setSpeed] = useState<GameSpeed>("rapid");
  const [mode, setMode] = useState<GameMode>("play");
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState<string | null>(null);
  const [comment, setComment] = useState(`Ready when you are, ${name}.`);
  const [moveLog, setMoveLog] = useState<Move[]>([]);
  const [whiteTime, setWhiteTime] = useState(secondsBySpeed.rapid);
  const [blackTime, setBlackTime] = useState(secondsBySpeed.rapid);
  const savedResult = useRef<string | null>(null);
  const thinkTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (thinkTimer.current) window.clearTimeout(thinkTimer.current);
  }, []);

  useEffect(() => {
    if (!finished || !moveLog.length || savedResult.current === finished) return;
    savedResult.current = finished;
    const games = saveGame({ id: `game-${Date.now()}`, playedAt: new Date().toISOString(), result: finished, speed, difficulty, moves: moveLog.map(({ san, color, before, after, from, to, captured, piece }) => ({ san, color, before, after, from, to, captured, piece })) });
    onGameSaved?.(games);
  }, [difficulty, finished, moveLog, onGameSaved, speed]);

  useEffect(() => {
    if (mode === "watch" && started && !finished && !thinking) computerTurn(game);
  }, [game, mode, started, finished, thinking]);

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      if (game.turn() === "w")
        setWhiteTime((value) => {
          if (value <= 1) setFinished("Time expired. The computer wins.");
          return Math.max(0, value - 1);
        });
      else
        setBlackTime((value) => {
          if (value <= 1) setFinished(`${name} wins on time.`);
          return Math.max(0, value - 1);
        });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished, game, name, started, thinking]);

  function soundFor(move: Move, position: Chess) {
    if (!sounds) return;
    onSound(
      position.isCheckmate()
        ? "checkmate"
        : position.isCheck()
          ? "check"
          : move.captured
            ? "capture"
            : "move",
    );
  }

  function finishIfNeeded(position: Chess) {
    if (!position.isGameOver()) return false;
    setFinished(
      position.isCheckmate()
        ? position.turn() === "w"
          ? "Checkmate. The computer wins."
          : `Checkmate. ${name} wins!`
        : "The game is drawn.",
    );
    return true;
  }

  function computerTurn(position: Chess, history = moveLog) {
    setThinking(true);
    setComment(mode === "watch" ? "Comparing candidate moves and checking the reply…" : `Give me a moment, ${name}. I’m checking your threats and my replies.`);
    if (thinkTimer.current) window.clearTimeout(thinkTimer.current);
    thinkTimer.current = window.setTimeout(() => {
      const next = new Chess(position.fen());
      const choice = chooseComputerMove(next, difficulty, history.flatMap((item) => [item.before, item.after]), history.map((item) => item.san));
      if (!choice) {
        setThinking(false);
        return;
      }
      const move = next.move(choice);
      setMoveLog((moves) => [...moves, move]);
      soundFor(move, next);
      setGame(next);
      setThinking(false);
      setComment(mode === "watch" ? `${move.color === "w" ? "White" : "Black"} chose ${move.san}. Watch what that changes.` : reactionFor(move, next, name));
      finishIfNeeded(next);
      thinkTimer.current = null;
    }, computerThinkDelay(difficulty, speed, mode === "watch"));
  }

  function move(from: Square, to: Square) {
    if (!started || finished || thinking || game.turn() !== "w" || mode === "watch") return;
    const next = new Chess(game.fen());
    try {
      const played = next.move({ from, to, promotion: "q" });
      setMoveLog((moves) => [...moves, played]);
      soundFor(played, next);
      setGame(next);
      setComment(reactionFor(played, next, name));
      if (!finishIfNeeded(next)) computerTurn(next, [...moveLog, played]);
    } catch {
      setComment("That move is not legal. Try another route.");
    }
    setSelected(null);
  }

  function select(square: Square) {
    if (!selected) {
      if (game.get(square)?.color === "w") setSelected(square);
      return;
    }
    if (selected === square) setSelected(null);
    else move(selected, square);
  }

  function start() {
    if (thinkTimer.current) window.clearTimeout(thinkTimer.current);
    const time = secondsBySpeed[speed];
    setGame(new Chess());
    setMoveLog([]);
    setWhiteTime(time);
    setBlackTime(time);
    setFinished(null);
    savedResult.current = null;
    setStarted(true);
    setComment(mode === "watch" ? "Settle in. I’ll point out the ideas while both sides play." : mode === "rating" ? `${name}, this calibration match will create your first provisional Elo.` : `Your clock is running, ${name}. White to move.`);
  }

  if (finished) {
    const playerWon = finished.includes(`${name} wins`) || finished.includes(`${name} wins!`);
    const draw = finished.includes("drawn");
    const baseRating: Record<Difficulty, number> = { beginner: 700, casual: 1000, club: 1300, expert: 1650 };
    const provisionalElo = Math.max(400, baseRating[difficulty] + (playerWon ? 140 : draw ? 0 : -120));
    return (
      <div className="game-analysis mount">
        <section className="card analysis-summary">
          <span className="pill">GAME COMPLETE</span>
          <h2>{finished}</h2>
          <p>{moveLog.length} half-moves played · {speed} · {difficulty}</p>
          {mode === "rating" && <div className="elo-result"><Gauge /><span>Provisional Elo</span><strong>{provisionalElo}</strong><small>One match is an initial estimate. Future calibration games will make it more reliable.</small></div>}
          <button className="button button--primary" onClick={start}>
            <RotateCcw /> Play again
          </button>
        </section>
        <section className="card analysis-review-cta">
          <ScanSearch />
          <span className="eyebrow">BOARD-BASED REVIEW</span>
          <h2>Replay the position, not a list.</h2>
          <p>ChessQuest will animate the match on the board and pause at the first moment where you had a meaningfully better choice.</p>
          <button className="button button--primary" onClick={onReviewRequested}>Replay and review</button>
        </section>
      </div>
    );
  }

  return (
    <div className="computer-game mount">
      <section className="game-panel card">
        {!started && (
          <div className="game-setup">
            <span className="eyebrow">NON-AI CHESS ENGINE</span>
            <h2>Choose how to enter the board</h2>
            <div className="game-mode-picker" role="group" aria-label="Match mode">
              <button className={mode === "play" ? "active" : ""} onClick={() => setMode("play")}><GraduationCap /> Play</button>
              <button className={mode === "watch" ? "active" : ""} onClick={() => setMode("watch")}><Eye /> Watch</button>
              <button className={mode === "rating" ? "active" : ""} onClick={() => { setMode("rating"); setDifficulty("club"); setSpeed("rapid"); }}><Gauge /> Elo test</button>
            </div>
            <label>Game type
              <Select value={speed} onValueChange={(value) => setSpeed(value as GameSpeed)}>
                <SelectTrigger className="game-select"><SelectValue>{speed === "bullet" ? "Bullet · 1 min" : speed === "blitz" ? "Blitz · 5 min" : speed === "rapid" ? "Rapid · 10 min" : "Classical · 30 min"}</SelectValue></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="bullet">Bullet · 1 min</SelectItem><SelectItem value="blitz">Blitz · 5 min</SelectItem><SelectItem value="rapid">Rapid · 10 min</SelectItem><SelectItem value="classical">Classical · 30 min</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </label>
            <label>Computer level
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)} disabled={mode === "rating"}>
                <SelectTrigger className="game-select"><SelectValue>{difficulty[0].toUpperCase() + difficulty.slice(1)}</SelectValue></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="beginner">Beginner</SelectItem><SelectItem value="casual">Casual</SelectItem><SelectItem value="club">Club</SelectItem><SelectItem value="expert">Expert</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </label>
            <p>Based on your reading, <strong>{recommended}</strong> is recommended. You can always choose another level.</p>
            <button className="button button--primary" onClick={start}>{mode === "watch" ? "Watch match" : mode === "rating" ? "Start Elo test" : "Start match"} <ChevronRight /></button>
          </div>
        )}
        {started && (
          <>
            <div className="game-clock"><span>Computer <strong>{formatTime(blackTime)}</strong></span><span>{name} <strong>{formatTime(whiteTime)}</strong></span></div>
            <div className="game-board" role="grid" aria-label="Chess game against the computer">
              {game.board().flatMap((rank, row) => rank.map((piece, file) => {
                const square = `${"abcdefgh"[file]}${8 - row}` as Square;
                return <button key={square} role="gridcell" aria-label={square} data-file={row === 7 ? "abcdefgh"[file] : undefined} data-rank={file === 0 ? 8 - row : undefined} className={`game-square ${(row + file) % 2 ? "game-square--dark" : "game-square--light"} ${selected === square ? "game-square--selected" : ""}`} onClick={() => select(square)}><span>{piece ? pieces[`${piece.color}${piece.type}`] : ""}</span></button>;
              }))}
            </div>
            {mode !== "watch" && <button className="button button--quiet resign-button" onClick={() => setFinished(`${name} resigned. The computer wins.`)}><Flag /> Resign and analyze</button>}
          </>
        )}
      </section>
      <p className="sr-only" aria-live="polite">{thinking ? "The computer is thinking." : comment}</p>
    </div>
  );
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
