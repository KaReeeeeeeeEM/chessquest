export type CheckersVariant = "american" | "international" | "brazilian" | "russian" | "spanish";
export type CheckersDifficulty = "beginner" | "casual" | "club" | "expert";
export type CheckersPlayer = "light" | "dark";
export type CheckersPiece = { player: CheckersPlayer; king: boolean };
export type CheckersBoard = Array<CheckersPiece | null>;
export type CheckersMove = { from: number; to: number; captures: number[] };

export const CHECKERS_RULES = {
  american: { name: "English / American", size: 8, rows: 3, flyingKings: false, backwardMen: false, maximumCapture: false, crownContinues: false },
  international: { name: "International", size: 10, rows: 4, flyingKings: true, backwardMen: true, maximumCapture: true, crownContinues: true },
  brazilian: { name: "Brazilian", size: 8, rows: 3, flyingKings: true, backwardMen: true, maximumCapture: true, crownContinues: true },
  russian: { name: "Russian", size: 8, rows: 3, flyingKings: true, backwardMen: true, maximumCapture: false, crownContinues: true },
  spanish: { name: "Spanish", size: 8, rows: 3, flyingKings: true, backwardMen: false, maximumCapture: true, crownContinues: false },
} as const;

const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;
const row = (index: number, size: number) => Math.floor(index / size);
const col = (index: number, size: number) => index % size;
const inside = (r: number, c: number, size: number) => r >= 0 && r < size && c >= 0 && c < size;
const indexOf = (r: number, c: number, size: number) => r * size + c;

export function createCheckersBoard(variant: CheckersVariant): CheckersBoard {
  const { size, rows } = CHECKERS_RULES[variant];
  return Array.from({ length: size * size }, (_, index) => {
    const r = row(index, size);
    if ((r + col(index, size)) % 2 === 0) return null;
    if (r < rows) return { player: "dark", king: false };
    if (r >= size - rows) return { player: "light", king: false };
    return null;
  });
}

function captureSequences(board: CheckersBoard, from: number, variant: CheckersVariant, trail: number[] = []): CheckersMove[] {
  const rules = CHECKERS_RULES[variant];
  const piece = board[from];
  if (!piece) return [];
  const size = rules.size;
  const allowed = piece.king || rules.backwardMen ? directions : directions.filter(([dr]) => piece.player === "light" ? dr < 0 : dr > 0);
  const results: CheckersMove[] = [];
  for (const [dr, dc] of allowed) {
    if (piece.king && rules.flyingKings) {
      let r = row(from, size) + dr;
      let c = col(from, size) + dc;
      let victim = -1;
      while (inside(r, c, size)) {
        const target = indexOf(r, c, size);
        const occupant = board[target];
        if (occupant) {
          if (occupant.player === piece.player || victim >= 0) break;
          victim = target;
        } else if (victim >= 0) {
          const next = board.slice();
          next[target] = piece;
          next[from] = null;
          next[victim] = null;
          const onward = captureSequences(next, target, variant, [...trail, victim]);
          if (onward.length) results.push(...onward.map((move) => ({ from, to: move.to, captures: move.captures })));
          else results.push({ from, to: target, captures: [...trail, victim] });
        }
        r += dr; c += dc;
      }
    } else {
      const mr = row(from, size) + dr;
      const mc = col(from, size) + dc;
      const lr = mr + dr;
      const lc = mc + dc;
      if (!inside(lr, lc, size)) continue;
      const middle = indexOf(mr, mc, size);
      const landing = indexOf(lr, lc, size);
      if (board[middle]?.player === piece.player || !board[middle] || board[landing]) continue;
      const next = board.slice();
      next[landing] = piece;
      next[from] = null;
      next[middle] = null;
      const reachesCrown = !piece.king && (row(landing, size) === 0 || row(landing, size) === size - 1);
      const onward = reachesCrown && !rules.crownContinues ? [] : captureSequences(next, landing, variant, [...trail, middle]);
      if (onward.length) results.push(...onward.map((move) => ({ from, to: move.to, captures: move.captures })));
      else results.push({ from, to: landing, captures: [...trail, middle] });
    }
  }
  return results;
}

export function legalCheckersMoves(board: CheckersBoard, player: CheckersPlayer, variant: CheckersVariant): CheckersMove[] {
  const rules = CHECKERS_RULES[variant];
  const captures = board.flatMap((piece, index) => piece?.player === player ? captureSequences(board, index, variant) : []);
  if (captures.length) {
    if (!rules.maximumCapture) return captures;
    const max = Math.max(...captures.map((move) => move.captures.length));
    return captures.filter((move) => move.captures.length === max);
  }
  const moves: CheckersMove[] = [];
  board.forEach((piece, from) => {
    if (!piece || piece.player !== player) return;
    const allowed = piece.king ? directions : directions.filter(([dr]) => piece.player === "light" ? dr < 0 : dr > 0);
    for (const [dr, dc] of allowed) {
      if (piece.king && rules.flyingKings) {
        let r = row(from, rules.size) + dr; let c = col(from, rules.size) + dc;
        while (inside(r, c, rules.size) && !board[indexOf(r, c, rules.size)]) {
          moves.push({ from, to: indexOf(r, c, rules.size), captures: [] }); r += dr; c += dc;
        }
      } else {
        const r = row(from, rules.size) + dr; const c = col(from, rules.size) + dc;
        if (inside(r, c, rules.size) && !board[indexOf(r, c, rules.size)]) moves.push({ from, to: indexOf(r, c, rules.size), captures: [] });
      }
    }
  });
  return moves;
}

export function applyCheckersMove(board: CheckersBoard, move: CheckersMove, variant: CheckersVariant): CheckersBoard {
  const next = board.slice();
  const piece = next[move.from];
  if (!piece) return next;
  next[move.from] = null;
  move.captures.forEach((captured) => { next[captured] = null; });
  const destinationRow = row(move.to, CHECKERS_RULES[variant].size);
  next[move.to] = { ...piece, king: piece.king || destinationRow === 0 || destinationRow === CHECKERS_RULES[variant].size - 1 };
  return next;
}

function evaluate(board: CheckersBoard, player: CheckersPlayer, variant: CheckersVariant) {
  const enemy = player === "light" ? "dark" : "light";
  const material = board.reduce((score, piece, index) => {
    if (!piece) return score;
    const value = piece.king ? 185 : 100;
    const progress = piece.king ? 0 : piece.player === "light" ? CHECKERS_RULES[variant].size - row(index, CHECKERS_RULES[variant].size) : row(index, CHECKERS_RULES[variant].size);
    return score + (piece.player === player ? value + progress * 3 : -value - progress * 3);
  }, 0);
  return material + (legalCheckersMoves(board, player, variant).length - legalCheckersMoves(board, enemy, variant).length) * 4;
}

export function chooseCheckersMove(board: CheckersBoard, player: CheckersPlayer, variant: CheckersVariant, difficulty: CheckersDifficulty, random = Math.random): CheckersMove | null {
  const moves = legalCheckersMoves(board, player, variant);
  if (!moves.length) return null;
  const depth = { beginner: 1, casual: 2, club: 3, expert: 4 }[difficulty];
  const enemy = player === "light" ? "dark" : "light";
  function search(position: CheckersBoard, turn: CheckersPlayer, remaining: number, alpha: number, beta: number): number {
    const available = legalCheckersMoves(position, turn, variant);
    if (!available.length) return turn === player ? -100000 - remaining : 100000 + remaining;
    if (!remaining) return evaluate(position, player, variant);
    let best = turn === player ? -Infinity : Infinity;
    for (const move of available) {
      const score = search(applyCheckersMove(position, move, variant), turn === "light" ? "dark" : "light", remaining - 1, alpha, beta);
      if (turn === player) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
      else { best = Math.min(best, score); beta = Math.min(beta, best); }
      if (beta <= alpha) break;
    }
    return best;
  }
  const ranked = moves.map((move) => ({ move, score: search(applyCheckersMove(board, move, variant), enemy, depth - 1, -Infinity, Infinity) })).sort((a, b) => b.score - a.score);
  const pool = difficulty === "beginner" ? ranked.slice(0, Math.min(4, ranked.length)) : difficulty === "casual" ? ranked.slice(0, Math.min(2, ranked.length)) : ranked.filter((entry) => entry.score === ranked[0].score);
  return pool[Math.floor(random() * pool.length)]?.move || ranked[0].move;
}
