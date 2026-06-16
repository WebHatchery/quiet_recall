import type { CardRating, RecallCard } from "../types";
import { addDays, nowIso, startOfLocalDay } from "./date";

export function isCardDue(card: RecallCard, date = new Date()): boolean {
  return new Date(card.dueAt).getTime() <= startOfLocalDay(date).getTime();
}

export function scheduleCard(
  card: RecallCard,
  rating: CardRating,
  date = new Date(),
): RecallCard {
  const nextReviews = card.reviews + 1;
  const nextLapses = rating === "hard" ? card.lapses + 1 : card.lapses;
  const ease = nextEase(card.ease, rating);
  const intervalDays = nextInterval(
    card.intervalDays,
    card.reviews,
    rating,
    ease,
  );
  const dueDate = addDays(date, intervalDays);
  const dueAt = startOfLocalDay(dueDate).toISOString();

  return {
    ...card,
    status: nextReviews < 2 ? "learning" : "review",
    dueAt,
    intervalDays,
    ease,
    reviews: nextReviews,
    lapses: nextLapses,
    lastReviewedAt: nowIso(),
    lastRating: rating,
    updatedAt: nowIso(),
  };
}

export function selectSessionCardIds(
  cards: RecallCard[],
  minutes: number,
  tiredMode: boolean,
  newCardLimit: number,
): string[] {
  const sorted = [...cards].sort((first, second) => {
    const firstDue = new Date(first.dueAt).getTime();
    const secondDue = new Date(second.dueAt).getTime();
    return (
      firstDue - secondDue || first.createdAt.localeCompare(second.createdAt)
    );
  });

  const dueCards = sorted.filter((card) => isCardDue(card));
  const reviewFallback = sorted.filter(
    (card) =>
      card.status !== "new" &&
      !dueCards.some((dueCard) => dueCard.id === card.id),
  );
  const reviewLimit = tiredMode
    ? 5
    : Math.max(5, Math.min(12, Math.round(minutes * 1.1)));
  const reviewCards = [...dueCards, ...reviewFallback].slice(0, reviewLimit);

  if (tiredMode) {
    return reviewCards.map((card) => card.id);
  }

  const usedIds = new Set(reviewCards.map((card) => card.id));
  const newCards = sorted
    .filter((card) => card.status === "new" && !usedIds.has(card.id))
    .slice(0, Math.max(0, Math.min(3, newCardLimit)));

  return [...reviewCards, ...newCards].map((card) => card.id);
}

export function isFamiliar(card: RecallCard): boolean {
  return card.reviews >= 3 && card.ease >= 2.35 && card.lastRating !== "hard";
}

export function isShaky(card: RecallCard): boolean {
  return card.lapses >= 2 || card.ease < 1.95 || card.lastRating === "hard";
}

function nextEase(currentEase: number, rating: CardRating): number {
  if (rating === "easy") {
    return Math.min(3.2, Number((currentEase + 0.12).toFixed(2)));
  }

  if (rating === "hard") {
    return Math.max(1.3, Number((currentEase - 0.2).toFixed(2)));
  }

  return Math.max(1.5, Number((currentEase - 0.02).toFixed(2)));
}

function nextInterval(
  currentInterval: number,
  previousReviews: number,
  rating: CardRating,
  ease: number,
): number {
  if (rating === "hard") {
    return 1;
  }

  if (previousReviews === 0) {
    return rating === "easy" ? 3 : 1;
  }

  const multiplier = rating === "easy" ? ease + 0.4 : ease;
  return Math.max(
    1,
    Math.min(45, Math.ceil(Math.max(1, currentInterval) * multiplier)),
  );
}
