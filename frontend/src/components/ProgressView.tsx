import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Library,
  TrendingUp,
} from "lucide-react";
import { MetricTile } from "./MetricTile";
import { useRecallStore } from "../stores/useRecallStore";
import { daysUntil } from "../utils/date";
import { summarizeProgress } from "../utils/progress";
import { isShaky } from "../utils/srs";

export function ProgressView() {
  const cards = useRecallStore((state) => state.cards);
  const progress = useRecallStore((state) => state.progress);
  const summary = summarizeProgress(cards, progress);
  const recentSentences = progress.typedSentences.slice(0, 4);
  const shakyCards = cards.filter(isShaky).slice(0, 6);
  const upcoming = [...cards]
    .sort(
      (first, second) =>
        new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime(),
    )
    .slice(0, 6);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6">
      <section>
        <p className="text-sm uppercase tracking-[0.16em] text-teal-100/70">
          Progress
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-stone-50">
          Quiet signals
        </h2>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          icon={CheckCircle2}
          label="Reviewed today"
          value={`${summary.reviewedToday}`}
        />
        <MetricTile
          icon={TrendingUp}
          label="Review accuracy"
          value={
            summary.reviewAccuracy === 0
              ? "Ready"
              : `${summary.reviewAccuracy}%`
          }
          tone="amber"
        />
        <MetricTile
          icon={Library}
          label="Familiar words"
          value={`${summary.familiarWords}`}
          tone="violet"
        />
        <MetricTile
          icon={CalendarCheck2}
          label="Nights this week"
          value={`${summary.nightsThisWeek}`}
          tone="rose"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-stone-700/70 bg-[#101119]/80 p-5">
          <div className="mb-4 flex items-center gap-2 text-stone-50">
            <HelpCircle aria-hidden="true" className="h-5 w-5 text-rose-100" />
            <h3 className="text-xl font-semibold">Shaky words</h3>
          </div>
          <div className="grid gap-3">
            {shakyCards.length === 0 ? (
              <p className="text-stone-400">No shaky words yet.</p>
            ) : (
              shakyCards.map((card) => (
                <div
                  key={card.id}
                  className="grid gap-2 rounded-md border border-stone-700 bg-stone-950/70 p-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-lg font-semibold text-stone-50">
                      {card.prompt}
                    </p>
                    <p className="text-sm text-stone-400">{card.meaning}</p>
                  </div>
                  <p className="text-sm text-rose-100">{card.lapses} hard</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-md border border-stone-700/70 bg-[#101119]/80 p-5">
          <div className="mb-4 flex items-center gap-2 text-stone-50">
            <Clock3 aria-hidden="true" className="h-5 w-5 text-teal-100" />
            <h3 className="text-xl font-semibold">Upcoming reviews</h3>
          </div>
          <div className="grid gap-3">
            {upcoming.map((card) => {
              const dueIn = daysUntil(card.dueAt);
              return (
                <div
                  key={card.id}
                  className="grid gap-2 rounded-md border border-stone-700 bg-stone-950/70 p-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-lg font-semibold text-stone-50">
                      {card.prompt}
                    </p>
                    <p className="text-sm text-stone-400">{card.group}</p>
                  </div>
                  <p className="text-sm text-teal-100">
                    {dueIn <= 0 ? "Due now" : `${dueIn}d`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-stone-700/70 bg-[#101119]/80 p-5">
          <h3 className="text-xl font-semibold text-stone-50">
            Weekly consistency
          </h3>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {lastSevenDays().map((dateKey) => {
              const completed = progress.completedNightDates.includes(dateKey);
              return (
                <div
                  key={dateKey}
                  className={`flex aspect-square items-center justify-center rounded-md border text-xs ${
                    completed
                      ? "border-teal-200/30 bg-teal-200/15 text-teal-100"
                      : "border-stone-700 bg-stone-950/70 text-stone-500"
                  }`}
                >
                  {dateKey.slice(8)}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-stone-700/70 bg-[#101119]/80 p-5">
          <h3 className="text-xl font-semibold text-stone-50">
            Saved sentences
          </h3>
          <div className="mt-4 grid gap-3">
            {recentSentences.length === 0 ? (
              <p className="text-stone-400">No saved sentences yet.</p>
            ) : (
              recentSentences.map((sentence) => (
                <div
                  key={sentence.id}
                  className="rounded-md border border-stone-700 bg-stone-950/70 p-4"
                >
                  <p className="text-sm text-stone-500">{sentence.prompt}</p>
                  <p className="mt-2 text-lg text-stone-50">{sentence.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function lastSevenDays(): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
}
