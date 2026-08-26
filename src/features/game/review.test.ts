import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { explainMove, type SavedMove } from "./review";

describe("book-grounded game review", () => {
  it("uses matching imported text and never invents a source", () => {
    const game = new Chess();
    const move = game.move("e4") as unknown as SavedMove;
    const books = [{ id: "book", title: "My Chess Book", author: "A", fileName: "a.epub", importedAt: "now", chapters: [{ id: "p1", title: "The Centre", excerpt: "A central pawn helps control the centre and releases the pieces.", moveCount: 0, activity: "read-and-recall" as const }] }];
    expect(explainMove(move, books).source?.book).toBe("My Chess Book");
    expect(explainMove(move, []).source).toBeNull();
  });
});
