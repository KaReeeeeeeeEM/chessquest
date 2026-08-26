import { useEffect, useMemo, useState } from "react";
import { BookOpen, Pause, Play, RotateCcw } from "lucide-react";
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
  useEffect(() => { setPly(0); setPlaying(true); }, [game?.id]);
  useEffect(() => {
    if (!game || !playing || ply >= game.moves.length) return;
    const timer = window.setTimeout(() => setPly((value) => value + 1), 1100);
    return () => window.clearTimeout(timer);
  }, [game, playing, ply]);
  const board = useMemo(() => new Chess(ply ? game?.moves[ply - 1]?.after : undefined), [game, ply]);
  if (!game) return <section className="empty card"><span className="eyebrow">REVIEW QUEUE</span><h2>No completed games yet</h2><p>Finish a computer match and its real move history will appear here automatically.</p></section>;
  const current = ply ? game.moves[ply - 1] : null;
  const insight = current ? explainMove(current, books) : null;
  return <div className="review-player mount">
    <section className="review-board-panel card">
      <div className="review-toolbar"><div><span className="eyebrow">AUTOPLAYING MATCH</span><strong>{new Date(game.playedAt).toLocaleDateString()} · {game.speed}</strong></div><Select value={game.id} onValueChange={(value) => value && setSelectedId(value)}><SelectTrigger aria-label="Choose completed game" className="review-game-select"><SelectValue>Choose game</SelectValue></SelectTrigger><SelectContent><SelectGroup>{games.map((item, index) => <SelectItem value={item.id} key={item.id}>Game {games.length - index} · {new Date(item.playedAt).toLocaleDateString()}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
      <div className="review-board" role="img" aria-label={`Position after ${ply} half-moves`}>{board.board().flatMap((rank, row) => rank.map((piece, file) => <span key={`${row}-${file}`} className={(row + file) % 2 ? "dark" : "light"}>{piece ? pieces[`${piece.color}${piece.type}`] : ""}</span>))}</div>
      <div className="review-controls"><button onClick={() => { setPly(0); setPlaying(true); }}><RotateCcw /> Restart</button><button className="review-play" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause /> : <Play />}{playing ? "Pause" : "Play"}</button><span>{ply} / {game.moves.length}</span></div>
    </section>
    <aside className="review-insight card" aria-live="polite">
      <span className="eyebrow">MOVE EXPLANATION</span>
      {current && insight ? <><div className={`review-verdict review-verdict--${insight.label.toLowerCase()}`}><strong>{current.san}</strong><span>{insight.label}</span></div><p>{insight.reason}</p>{insight.source ? <blockquote><BookOpen /><div><strong>{insight.source.book}</strong><small>{insight.source.section}</small><p>{insight.source.excerpt}</p></div></blockquote> : <div className="review-no-source"><strong>General chess principle</strong><p>No matching passage was found in your imported books, so ChessQuest will not invent a citation.</p></div>}</> : <><h2>Ready to replay</h2><p>The match will advance automatically and explain each move.</p></>}
    </aside>
  </div>;
}
