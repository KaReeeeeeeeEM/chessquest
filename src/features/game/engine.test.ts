import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { chooseComputerMove, computerThinkDelay, evaluatePosition } from "./engine";

describe("local chess engine", () => {
  it("evaluates the initial material as equal", () => {
    expect(evaluatePosition(new Chess())).toBe(0);
  });

  it("always chooses a legal move", () => {
    const game = new Chess();
    game.move("e4");
    const legalMoves = game.moves();
    const move = chooseComputerMove(game, "beginner");
    expect(move).toBeDefined();
    expect(legalMoves).toContain(move?.san);
  });

  it("uses a visible, speed-aware thinking delay", () => {
    expect(computerThinkDelay("beginner", "bullet", false, () => 0)).toBe(1800);
    expect(computerThinkDelay("club", "rapid", false, () => 1)).toBe(12500);
    expect(computerThinkDelay("expert", "classical", true, () => 1)).toBe(16000);
  });

  it("varies legal replies from an offline master-opening repertoire", () => {
    const game = new Chess();
    game.move("e4");
    const reply = chooseComputerMove(game, "club", [], ["e4"]);
    expect(["e5", "c5", "c6", "e6"]).toContain(reply?.san);
  });

  it("always takes an available checkmate even at beginner difficulty", () => {
    const game = new Chess("7k/8/5KQ1/8/8/8/8/8 w - - 0 1");
    const move = chooseComputerMove(game, "beginner");
    expect(move).toBeDefined();
    game.move(move!);
    expect(game.isCheckmate()).toBe(true);
  });

  it("rewards driving the losing king toward the edge in simple endgames", () => {
    const centralKing = new Chess("8/8/8/3k4/8/8/4Q3/4K3 w - - 0 1");
    const edgeKing = new Chess("k7/8/8/8/8/8/4Q3/4K3 w - - 0 1");
    expect(evaluatePosition(edgeKing)).toBeGreaterThan(evaluatePosition(centralKing));
  });

  it("converts a decisive computer endgame instead of drifting to a draw", () => {
    const game = new Chess("7k/8/8/8/8/8/4Q3/4K3 w - - 0 1");
    for (let ply = 0; ply < 80 && !game.isGameOver(); ply += 1) {
      const move = chooseComputerMove(game, "beginner");
      expect(move).toBeDefined();
      game.move(move!);
    }
    expect(game.isCheckmate()).toBe(true);
  });
});
