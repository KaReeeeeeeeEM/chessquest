export type ReadingProgress = {
  version: 1;
  pagesByDate: Record<string, number>;
  pagesByBook: Record<string, number>;
  lastBookId?: string;
};

const STORAGE_KEY = "cq-reading-progress-v1";

export const emptyReadingProgress = (): ReadingProgress => ({
  version: 1,
  pagesByDate: {},
  pagesByBook: {},
});

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function loadReadingProgress(): ReadingProgress {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null",
    ) as Partial<ReadingProgress> | null;
    if (!stored || stored.version !== 1) return emptyReadingProgress();
    return {
      version: 1,
      pagesByDate: stored.pagesByDate || {},
      pagesByBook: stored.pagesByBook || {},
      lastBookId: stored.lastBookId,
    };
  } catch {
    return emptyReadingProgress();
  }
}

export function saveReadingProgress(progress: ReadingProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function recordPage(
  progress: ReadingProgress,
  bookId: string,
  pageNumber: number,
): ReadingProgress {
  const today = localDateKey();
  return {
    version: 1,
    pagesByDate: {
      ...progress.pagesByDate,
      [today]: (progress.pagesByDate[today] || 0) + 1,
    },
    pagesByBook: {
      ...progress.pagesByBook,
      [bookId]: Math.max(progress.pagesByBook[bookId] || 0, pageNumber),
    },
    lastBookId: bookId,
  };
}

export function readingStreak(
  pagesByDate: Record<string, number>,
  now = new Date(),
) {
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!pagesByDate[localDateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  while (pagesByDate[localDateKey(cursor)] > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
