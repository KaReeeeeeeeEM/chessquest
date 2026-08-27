import { describe, expect, it } from "vitest";
import { applyCheckersMove, CHECKERS_RULES, chooseCheckersMove, createCheckersBoard, legalCheckersMoves, type CheckersBoard } from "./engine";

describe("checkers engine", () => {
  it("sets up each board with the official piece count", () => {
    expect(createCheckersBoard("american").filter(Boolean)).toHaveLength(24);
    expect(createCheckersBoard("international").filter(Boolean)).toHaveLength(40);
  });
  it("makes captures compulsory", () => {
    const board: CheckersBoard = Array(64).fill(null);
    board[42] = { player: "light", king: false };
    board[33] = { player: "dark", king: false };
    board[44] = { player: "light", king: false };
    expect(legalCheckersMoves(board, "light", "american")).toEqual([{ from: 42, to: 24, captures: [33] }]);
  });
  it("crowns a man on the final row", () => {
    const board: CheckersBoard = Array(64).fill(null);
    board[9] = { player: "light", king: false };
    expect(applyCheckersMove(board, { from: 9, to: 0, captures: [] }, "american")[0]?.king).toBe(true);
  });
  it("offers all configured variants and a legal computer choice", () => {
    expect(Object.keys(CHECKERS_RULES)).toEqual(["american", "international", "brazilian", "russian"]);
    const board = createCheckersBoard("brazilian");
    const move = chooseCheckersMove(board, "dark", "brazilian", "club", () => 0);
    expect(legalCheckersMoves(board, "dark", "brazilian")).toContainEqual(move);
  });
});
