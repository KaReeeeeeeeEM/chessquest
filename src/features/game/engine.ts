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

// Compact offline repertoire derived from established master opening families.
const OPENING_LINES = [
  ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"],
  ["e4", "c5", "Nf3", "d6", "d4", "cxd4"],
  ["e4", "c6", "d4", "d5", "Nc3", "dxe4"],
  ["e4", "e6", "d4", "d5", "Nc3", "Bb4"],
  ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"],
  ["d4", "d5", "c4", "e6", "Nc3", "Nf6"],
  ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"],
  ["c4", "e5", "Nc3", "Nf6", "g3", "d5"],
  ["Nf3", "d5", "g3", "c5", "Bg2", "Nc6"],
];

function openingBookMove(game: Chess, history: string[]) {
  const candidates = OPENING_LINES.filter((line) => history.every((move, index) => line[index] === move)).map((line) => line[history.length]).filter(Boolean);
  const legal = candidates.filter((san) => game.moves().includes(san));
  return legal[Math.floor(Math.random() * legal.length)];
}

export function evaluatePosition(game: Chess) {
  if (game.isCheckmate()) return game.turn() === "w" ? -100000 : 100000;
  if (game.isDraw()) return 0;
  const material = game
    .board()
    .flat()
    .reduce(
      (score, piece) =>
        score +
        (piece ? PIECE_VALUE[piece.type] * (piece.color === "w" ? 1 : -1) : 0),
      0,
    );
  const centre = ["d4", "e4", "d5", "e5"].reduce((score, square) => {
    const piece = game.get(square as import("chess.js").Square);
    return score + (piece ? (piece.color === "w" ? 20 : -20) : 0);
  }, 0);
  const developed = ["b1", "g1", "c1", "f1", "b8", "g8", "c8", "f8"].reduce((score, square, index) => {
    const piece = game.get(square as import("chess.js").Square);
    const stayedHome = Boolean(piece);
    const white = index < 4;
    return score + (stayedHome ? 0 : white ? 12 : -12);
  }, 0);
  return material + centre + developed;
}

export function computerThinkDelay(
  difficulty: Difficulty,
  speed: "bullet" | "blitz" | "rapid" | "classical",
  watching: boolean,
  random = Math.random,
) {
  const base = { bullet: 1800, blitz: 3500, rapid: 6000, classical: 9000 }[speed];
  const depthPause = { beginner: 0, casual: 1200, club: 2500, expert: 4500 }[difficulty];
  const variablePause = random() * (watching ? 2500 : 4000);
  return Math.round(base + depthPause + variablePause);
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

export function chooseComputerMove(game: Chess, difficulty: Difficulty, avoidPositions: string[] = [], history: string[] = []) {
  const bookMove = openingBookMove(game, history);
  if (bookMove) return game.moves({ verbose: true }).find((move) => move.san === bookMove);
  const depth = difficulty === "expert" ? 3 : difficulty === "club" ? 2 : 1;
  const maximizing = game.turn() === "w";
  const normalizedAvoid = new Set(avoidPositions.map((fen) => fen.split(" ").slice(0, 4).join(" ")));
  const scored = game.moves({ verbose: true }).map((move) => {
    game.move(move);
    const repeated = normalizedAvoid.has(game.fen().split(" ").slice(0, 4).join(" "));
    const score = search(game, depth - 1, -Infinity, Infinity) + (repeated ? (maximizing ? -500 : 500) : 0);
    game.undo();
    return { move, score };
  });
  scored.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);
  const pool =
    difficulty === "beginner"
      ? scored.slice(0, Math.min(6, scored.length))
      : difficulty === "casual"
        ? scored.slice(0, Math.min(4, scored.length))
        : difficulty === "club"
          ? scored.slice(0, Math.min(2, scored.length))
          : scored.slice(0, 1);
  const weights = pool.map((_, index) => Math.max(1, pool.length - index));
  const roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return pool.find((_, index) => (cursor += weights[index]) >= roll)?.move || pool[0]?.move;
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
