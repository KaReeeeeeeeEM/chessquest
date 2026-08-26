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
    expect(computerThinkDelay("beginner", "bullet", false, () => 0)).toBe(650);
    expect(computerThinkDelay("club", "rapid", false, () => 1)).toBe(2510);
    expect(computerThinkDelay("expert", "classical", true, () => 1)).toBe(2920);
  });

  it("varies legal replies from an offline master-opening repertoire", () => {
    const game = new Chess();
    game.move("e4");
    const reply = chooseComputerMove(game, "club", [], ["e4"]);
    expect(["e5", "c5", "c6", "e6"]).toContain(reply?.san);
  });
});
