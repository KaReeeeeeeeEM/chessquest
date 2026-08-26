import { Chess } from "chess.js";
import type { ImportedBook } from "../library/epub";
import { evaluatePosition, type Difficulty } from "./engine";
import type { GameSpeed } from "./ComputerGame";

export type SavedMove = { san: string; color: "w" | "b"; before: string; after: string; from: string; to: string; captured?: string; piece: string };
export type SavedGame = { id: string; playedAt: string; result: string; speed: GameSpeed; difficulty: Difficulty; moves: SavedMove[]; reviewedAt?: string };
const KEY = "cq-completed-games";

export function loadGames(): SavedGame[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as SavedGame[]; } catch { return []; }
}
export function saveGame(game: SavedGame) {
  const next = [game, ...loadGames().filter((item) => item.id !== game.id)].slice(0, 30);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function explainMove(move: SavedMove, books: ImportedBook[]) {
  const before = new Chess(move.before);
  const after = new Chess(move.after);
  const delta = evaluatePosition(after) - evaluatePosition(before);
  const loss = move.color === "w" ? -delta : delta;
  const isCastle = move.san.includes("O-O");
  const isCheck = move.san.includes("+");
  const isCentre = move.piece === "p" && ["d", "e"].includes(move.to[0]);
  const label = loss > 220 ? "Risky" : move.captured || isCastle || isCheck || isCentre ? "Good" : "Sound";
  const reason = loss > 220
    ? `This move gave away roughly ${Math.round(loss / 100)} points of material. Before committing, check every forcing capture and reply.`
    : isCastle ? "Castling improves king safety and connects the rooks."
      : isCheck ? "The check gains tempo because the opponent must answer the king threat."
        : move.captured ? "This capture changes the material balance without an immediate material concession."
          : isCentre ? "This pawn move contests central squares and gives your pieces more useful routes."
            : "The move keeps the material balance stable, though a stronger plan may still exist.";
  const words = isCastle ? ["castle", "castling", "king safety"] : isCheck ? ["check", "king"] : move.captured ? ["capture", "takes", "exchange", "tactic"] : isCentre ? ["centre", "center", "central", "pawn"] : ["position", "development", "move"];
  for (const book of books) for (const chapter of book.chapters) {
    const lower = chapter.excerpt.toLowerCase();
    const keyword = words.find((word) => lower.includes(word));
    if (keyword) {
      const index = lower.indexOf(keyword);
      const start = Math.max(0, index - 70);
      return { label, reason, source: { book: book.title, section: chapter.title, excerpt: `${start ? "…" : ""}${chapter.excerpt.slice(start, start + 190)}…` } };
    }
  }
  return { label, reason, source: null };
}
