import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Lightbulb, Pause, Play, RotateCcw } from "lucide-react";
import { Chess } from "chess.js";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ImportedBook } from "../library/epub";
import { explainMove, type SavedGame } from "./review";

const pieces: Record<string, string> = { wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔", bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚" };

export function GameReview({ games, books }: { games: SavedGame[]; books: ImportedBook[] }) {
  const [selectedId, setSelectedId] = useState(games[0]?.id || "");
  const game = games.find((item) => item.id === selectedId) || games[0];
  const [ply, setPly] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [acknowledged, setAcknowledged] = useState<number[]>([]);
  useEffect(() => { setPly(0); setPlaying(true); setAcknowledged([]); }, [game?.id]);
  useEffect(() => {
    if (!game || !playing || ply >= game.moves.length) return;
    const timer = window.setTimeout(() => setPly((value) => value + 1), 1100);
    return () => window.clearTimeout(timer);
  }, [game, playing, ply]);
  const board = useMemo(() => new Chess(ply ? game?.moves[ply - 1]?.after : undefined), [game, ply]);
  const current = ply && game ? game.moves[ply - 1] : null;
  const insight = current ? explainMove(current, books) : null;
  const teachable = Boolean(current?.color === "w" && insight && ["Risky", "Could improve"].includes(insight.label));
  useEffect(() => {
    if (teachable && !acknowledged.includes(ply)) setPlaying(false);
  }, [acknowledged, ply, teachable]);
  const continueReview = () => {
    setAcknowledged((items) => items.includes(ply) ? items : [...items, ply]);
    setPlaying(true);
  };
  if (!game) return <section className="empty card"><span className="eyebrow">REVIEW QUEUE</span><h2>No completed games yet</h2><p>Finish a computer match and its real move history will appear here automatically.</p></section>;
  return <div className="review-player mount">
    <section className="review-board-panel card">
      <div className="review-toolbar"><div><span className="eyebrow">AUTOPLAYING MATCH</span><strong>{new Date(game.playedAt).toLocaleDateString()} · {game.speed}</strong></div><Select value={game.id} onValueChange={(value) => value && setSelectedId(value)}><SelectTrigger aria-label="Choose completed game" className="review-game-select"><SelectValue>Choose game</SelectValue></SelectTrigger><SelectContent><SelectGroup>{games.map((item, index) => <SelectItem value={item.id} key={item.id}>Game {games.length - index} · {new Date(item.playedAt).toLocaleDateString()}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
      <div className="review-board" role="img" aria-label={`Position after ${ply} half-moves`}>{board.board().flatMap((rank, row) => rank.map((piece, file) => { const square = `${"abcdefgh"[file]}${8 - row}`; const changed = current && (square === current.from || square === current.to); return <span key={`${row}-${file}-${piece?.color || ""}${piece?.type || ""}`} data-file={row === 7 ? "abcdefgh"[file] : undefined} data-rank={file === 0 ? 8 - row : undefined} className={`${(row + file) % 2 ? "dark" : "light"} ${changed ? "review-square--changed" : ""}`}>{piece ? pieces[`${piece.color}${piece.type}`] : ""}</span>; }))}</div>
      <div className="review-controls"><button onClick={() => { setPly(0); setPlaying(true); setAcknowledged([]); }}><RotateCcw /> Restart</button><div className="review-step-controls"><button aria-label="Previous move" disabled={!ply} onClick={() => { setPlaying(false); setPly((value) => Math.max(0, value - 1)); }}><ChevronLeft /></button><button className="review-play" onClick={() => teachable && !acknowledged.includes(ply) ? continueReview() : setPlaying((value) => !value)}>{playing ? <Pause /> : <Play />}{teachable && !acknowledged.includes(ply) ? "Continue review" : playing ? "Pause" : "Play"}</button><button aria-label="Next move" disabled={ply >= game.moves.length} onClick={() => { setPlaying(false); setPly((value) => Math.min(game.moves.length, value + 1)); }}><ChevronRight /></button></div><span>{ply} / {game.moves.length}</span></div>
    </section>
    <aside className="review-insight card" aria-live="polite">
      <span className="eyebrow">MOVE EXPLANATION</span>
      {current && insight ? <>{teachable && !acknowledged.includes(ply) && <div className="review-pause"><Lightbulb /><div><strong>Paused for you</strong><p>This is a moment where you could have done better. Study the board before continuing.</p></div></div>}<div className={`review-verdict review-verdict--${insight.label.toLowerCase().replace(" ", "-")}`}><strong>{Math.ceil(ply / 2)}{current.color === "b" ? "…" : "."} {current.san}</strong><span>{insight.label}</span></div><p>{insight.reason}</p>{insight.bestMove && teachable && <div className="review-alternative"><span>Stronger candidate</span><strong>{insight.bestMove}</strong></div>}{insight.source ? <blockquote><BookOpen /><div><strong>{insight.source.book}</strong><small>{insight.source.section}</small><p>{insight.source.excerpt}</p></div></blockquote> : <div className="review-no-source"><strong>General chess principle</strong><p>No matching passage was found in your imported books, so ChessQuest will not invent a citation.</p></div>}</> : <><h2>Ready to replay</h2><p>The match will advance on the board and pause automatically at your first teachable decision.</p></>}
    </aside>
  </div>;
}
