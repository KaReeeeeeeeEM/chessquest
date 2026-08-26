import { Chess, type Move } from "chess.js";

export type Difficulty = "beginner" | "casual" | "club" | "expert";

const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

export function evaluatePosition(game: Chess) {
  if (game.isCheckmate()) return game.turn() === "w" ? -100000 : 100000;
  if (game.isDraw()) return 0;
  return game
    .board()
    .flat()
    .reduce(
      (score, piece) =>
        score +
        (piece ? PIECE_VALUE[piece.type] * (piece.color === "w" ? 1 : -1) : 0),
      0,
    );
}

function search(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) return evaluatePosition(game);
  const maximizing = game.turn() === "w";
  let best = maximizing ? -Infinity : Infinity;
  for (const move of game.moves()) {
    game.move(move);
    const score = search(game, depth - 1, alpha, beta);
    game.undo();
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function chooseComputerMove(game: Chess, difficulty: Difficulty) {
  const depth = difficulty === "expert" ? 3 : difficulty === "club" ? 2 : 1;
  const scored = game.moves({ verbose: true }).map((move) => {
    game.move(move);
    const score = search(game, depth - 1, -Infinity, Infinity);
    game.undo();
    return { move, score };
  });
  scored.sort((a, b) => a.score - b.score);
  const pool =
    difficulty === "beginner"
      ? scored.slice(0, Math.min(6, scored.length))
      : difficulty === "casual"
        ? scored.slice(0, Math.min(3, scored.length))
        : scored.slice(0, 1);
  return pool[Math.floor(Math.random() * pool.length)]?.move;
}

export function reactionFor(move: Move, game: Chess, name: string) {
  if (game.isCheckmate()) return `That’s mate, ${name}. What a finish.`;
  if (game.isCheck()) return `Check. Breathe, ${name}—your king still has options.`;
  if (move.captured) return `A capture! I knew you were watching that square.`;
  if (move.san.includes("O-O")) return "King tucked away. Sensible and annoyingly calm.";
  if (move.piece === "p" && ["d", "e"].includes(move.to[0]))
    return "You’re claiming the centre. I noticed.";
  return [
    `Your move changed the position, ${name}. My turn to think.`,
    "Quiet move. Those are often the dangerous ones.",
    "Interesting. I had another square in mind.",
  ][game.moveNumber() % 3];
}

export function analyzeMoves(moves: Move[]) {
  return moves.map((move, index) => {
    const before = new Chess(move.before);
    const after = new Chess(move.after);
    const delta = evaluatePosition(after) - evaluatePosition(before);
    const loss = move.color === "w" ? -delta : delta;
    const label = loss > 250 ? "Mistake" : loss > 100 ? "Inaccuracy" : "Solid";
    return { number: index + 1, san: move.san, color: move.color, label, delta };
  });
}

