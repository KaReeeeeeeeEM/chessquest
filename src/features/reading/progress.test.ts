import { describe, expect, it } from "vitest";
import { emptyReadingProgress, readingStreak, recordPage } from "./progress";

describe("reading progress", () => {
  it("starts with no fabricated activity", () => {
    expect(emptyReadingProgress()).toEqual({
      version: 1,
      pagesByDate: {},
      pagesByBook: {},
    });
  });

  it("counts consecutive reading days and allows yesterday as the latest day", () => {
    const dates = { "2026-08-23": 2, "2026-08-24": 5, "2026-08-25": 1 };
    expect(readingStreak(dates, new Date(2026, 7, 26))).toBe(3);
  });

  it("records real pages without moving progress backwards", () => {
    const first = recordPage(emptyReadingProgress(), "book-1", 3);
    const next = recordPage(first, "book-1", 2);
    expect(next.pagesByBook["book-1"]).toBe(3);
    expect(Object.values(next.pagesByDate)).toEqual([2]);
  });
});
