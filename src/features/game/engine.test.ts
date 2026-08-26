import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { chooseComputerMove, evaluatePosition } from "./engine";

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
});
