import { describe, expect, it } from "vitest";
import { tipForDay } from "./tips";

describe("daily tips", () => {
  it("provides a distinct lesson and practice pairing for the coming 365 days", () => {
    const start = new Date(2026, 7, 26);
    const tips = Array.from({ length: 365 }, (_, offset) => {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      return tipForDay(date);
    });
    expect(new Set(tips.map((tip) => `${tip.title}|${tip.practice}`)).size).toBe(365);
    expect(tips.every((tip) => tip.body.length > 40 && tip.practice.length > 20)).toBe(true);
  });
});
