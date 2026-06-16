import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Moon,
  Timer,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { AccountPanel } from "./AccountPanel";
import { MetricTile } from "./MetricTile";
import { SessionView } from "./SessionView";
import { useRecallStore } from "../stores/useRecallStore";
import { summarizeProgress } from "../utils/progress";

const minuteOptions = [5, 10];

export function TonightScreen() {
  const activeSession = useRecallStore((state) => state.activeSession);
  const tiredMode = useRecallStore((state) => state.tiredMode);
  const selectedMinutes = useRecallStore((state) => state.selectedMinutes);
  const settings = useRecallStore((state) => state.settings);
  const cards = useRecallStore((state) => state.cards);
  const progress = useRecallStore((state) => state.progress);
  const summary = useMemo(
    () => summarizeProgress(cards, progress),
    [cards, progress],
  );
  const setTiredMode = useRecallStore((state) => state.setTiredMode);
  const setSelectedMinutes = useRecallStore(
    (state) => state.setSelectedMinutes,
  );
  const startSession = useRecallStore((state) => state.startSession);

  if (activeSession) {
    return <SessionView />;
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <motion.section
        initial={settings.reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={settings.reducedMotion ? undefined : { opacity: 1, y: 0 }}
        className="flex min-h-[calc(100vh-10rem)] flex-col justify-center rounded-md border border-stone-700/70 bg-[#101119]/80 p-5 shadow-2xl shadow-black/20 sm:p-8"
      >
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-teal-200/15 bg-teal-200/8 px-3 py-2 text-sm text-teal-100">
            <Moon aria-hidden="true" className="h-4 w-4" />
            Night desk
          </div>

          <h2 className="text-4xl font-semibold leading-tight text-stone-50 sm:text-5xl">
            Tonight&apos;s quiet review
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-stone-300">
            Review what is due, read one tiny Japanese line, and finish cleanly.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              className="inline-flex min-h-16 items-center justify-center gap-3 rounded-md bg-stone-100 px-6 text-lg font-semibold text-stone-950 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:ring-offset-2 focus:ring-offset-[#101119]"
              onClick={startSession}
            >
              <Moon aria-hidden="true" className="h-5 w-5" />
              Start Tonight&apos;s Session
            </button>
            <button
              type="button"
              aria-pressed={tiredMode}
              className={`inline-flex min-h-16 items-center justify-center gap-3 rounded-md border px-5 text-base font-semibold transition ${
                tiredMode
                  ? "border-amber-200/35 bg-amber-200/15 text-amber-100"
                  : "border-stone-600 bg-stone-900 text-stone-100 hover:bg-stone-800"
              }`}
              onClick={() => setTiredMode(!tiredMode)}
            >
              <Clock3 aria-hidden="true" className="h-5 w-5" />
              Tired Mode
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="grid grid-cols-3 rounded-md border border-stone-700 bg-stone-950/70 p-1">
              {minuteOptions.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={`min-h-11 rounded px-4 text-sm font-medium transition ${
                    selectedMinutes === minutes && !tiredMode
                      ? "bg-teal-100 text-stone-950"
                      : "text-stone-300 hover:bg-stone-800 hover:text-stone-50"
                  }`}
                  onClick={() => setSelectedMinutes(minutes)}
                  disabled={tiredMode}
                >
                  {minutes} min
                </button>
              ))}
              <button
                type="button"
                className={`min-h-11 rounded px-4 text-sm font-medium transition ${
                  selectedMinutes !== 5 && selectedMinutes !== 10 && !tiredMode
                    ? "bg-teal-100 text-stone-950"
                    : "text-stone-300 hover:bg-stone-800 hover:text-stone-50"
                }`}
                onClick={() =>
                  setSelectedMinutes(settings.customSessionMinutes)
                }
                disabled={tiredMode}
              >
                Custom
              </button>
            </div>

            <label className="flex min-h-12 items-center gap-3 rounded-md border border-stone-700 bg-stone-950/60 px-4 text-sm text-stone-300">
              <Timer aria-hidden="true" className="h-4 w-4 text-stone-400" />
              <span className="shrink-0">Minutes</span>
              <input
                type="range"
                min={5}
                max={15}
                value={selectedMinutes}
                onChange={(event) =>
                  setSelectedMinutes(Number(event.target.value))
                }
                disabled={tiredMode}
                className="w-full accent-teal-200"
              />
              <span className="w-8 text-right text-stone-100">
                {tiredMode ? 5 : selectedMinutes}
              </span>
            </label>
          </div>
        </div>
      </motion.section>

      <aside className="grid content-start gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            icon={CheckCircle2}
            label="Reviewed today"
            value={`${summary.reviewedToday}`}
          />
          <MetricTile
            icon={TrendingUp}
            label="Accuracy"
            value={
              summary.reviewAccuracy === 0
                ? "Ready"
                : `${summary.reviewAccuracy}%`
            }
            tone="amber"
          />
          <MetricTile
            icon={BookOpen}
            label="Familiar words"
            value={`${summary.familiarWords}`}
            tone="violet"
          />
          <MetricTile
            icon={Timer}
            label="Due now"
            value={`${summary.upcomingReviews}`}
            tone="rose"
          />
        </div>
        <AccountPanel />
      </aside>
    </div>
  );
}
