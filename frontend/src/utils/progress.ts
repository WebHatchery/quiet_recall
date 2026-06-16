import type { ProgressSummary, RecallCard, RecallProgress } from "../types";
import { isCardDue, isFamiliar, isShaky } from "./srs";
import { todayKey } from "./date";

export function summarizeProgress(
  cards: RecallCard[],
  progress: RecallProgress,
): ProgressSummary {
  const today = todayKey();
  const reviewedToday = progress.reviewedByDate[today] ?? 0;
  const correctToday = progress.correctByDate[today] ?? 0;
  const completedThisWeek = progress.completedNightDates.filter((dateKey) =>
    isWithinCurrentWeek(dateKey),
  ).length;
  const completedReadings = new Set(progress.completedReadingIds).size;

  return {
    reviewedToday,
    reviewAccuracy:
      reviewedToday === 0
        ? 0
        : Math.round((correctToday / reviewedToday) * 100),
    familiarWords: cards.filter(isFamiliar).length,
    shakyWords: cards.filter(isShaky).length,
    upcomingReviews: cards.filter((card) => isCardDue(card)).length,
    nightsThisWeek: completedThisWeek,
    readingConfidence: Math.min(100, Math.round((completedReadings / 7) * 100)),
  };
}

function isWithinCurrentWeek(dateKey: string): boolean {
  const date = new Date(`${dateKey}T00:00:00`);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
}
