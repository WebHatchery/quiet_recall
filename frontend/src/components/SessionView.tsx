import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  Headphones,
  Moon,
  PenLine,
  SkipForward,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRecallStore } from "../stores/useRecallStore";
import type {
  CardRating,
  RecallCard,
  ReadingItem,
  SentenceTemplate,
  StudySession,
} from "../types";
import { formatTimer } from "../utils/date";

export function SessionView() {
  const session = useRecallStore((state) => state.activeSession);
  const cards = useRecallStore((state) => state.cards);
  const readings = useRecallStore((state) => state.readings);
  const templates = useRecallStore((state) => state.sentenceTemplates);
  const settings = useRecallStore((state) => state.settings);
  const tickSession = useRecallStore((state) => state.tickSession);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
      tickSession();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [tickSession]);

  const card = useMemo(
    () =>
      session?.step === "review"
        ? cards.find(
            (candidate) =>
              candidate.id === session.cardIds[session.currentCardIndex],
          )
        : undefined,
    [cards, session],
  );
  const reading = readings.find(
    (candidate) => candidate.id === session?.readingId,
  );
  const template = templates.find(
    (candidate) => candidate.id === session?.sentenceTemplateId,
  );
  const remainingSeconds = session
    ? Math.ceil((new Date(session.expiresAt).getTime() - now) / 1000)
    : 0;

  if (!session) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-teal-100/70">
            Session
          </p>
          <h2 className="text-2xl font-semibold text-stone-50">
            {session.tiredMode ? "Tired Mode" : "Tonight"}
          </h2>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-stone-700 bg-stone-950/70 px-4 py-3 text-stone-200">
          <Moon aria-hidden="true" className="h-4 w-4 text-teal-100" />
          <span>{formatTimer(remainingSeconds)}</span>
        </div>
      </div>

      <ProgressRail session={session} />

      {session.timeExpired && session.step !== "done" ? (
        <div className="mb-4 rounded-md border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
          Finish this step, then close for tonight.
        </div>
      ) : null}

      {session.step === "review" && card ? (
        <ReviewStep
          card={card}
          session={session}
          romajiVisible={settings.romajiVisible}
        />
      ) : null}
      {session.step === "reading" && reading ? (
        <ReadingStep reading={reading} />
      ) : null}
      {session.step === "sentence" && template ? (
        <SentenceStep template={template} />
      ) : null}
      {session.step === "done" ? <SleepLanding session={session} /> : null}
    </main>
  );
}

function ProgressRail({ session }: { session: StudySession }) {
  const reviewTotal = session.cardIds.length;
  const reviewPosition = Math.min(session.currentCardIndex + 1, reviewTotal);
  const label =
    session.step === "review"
      ? `Review ${reviewPosition} of ${reviewTotal}`
      : session.step === "reading"
        ? "Tiny reading"
        : session.step === "sentence"
          ? "Typed sentence"
          : "Done";
  const progress =
    session.step === "done"
      ? 100
      : reviewTotal === 0
        ? 34
        : Math.round(
            (Math.min(session.currentCardIndex, reviewTotal) /
              Math.max(1, reviewTotal)) *
              70,
          );

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between text-sm text-stone-400">
        <span>{label}</span>
        <span>{session.reviewedCount} reviewed</span>
      </div>
      <progress className="session-progress" value={progress} max={100}>
        {progress}%
      </progress>
    </div>
  );
}

function ReviewStep({
  card,
  session,
  romajiVisible,
}: {
  card: RecallCard;
  session: StudySession;
  romajiVisible: boolean;
}) {
  const revealCard = useRecallStore((state) => state.revealCard);
  const rateCard = useRecallStore((state) => state.rateCard);

  return (
    <motion.section
      key={card.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid flex-1 place-items-center rounded-md border border-stone-700/70 bg-[#101119]/90 p-5 sm:p-8"
    >
      <div className="w-full max-w-2xl text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.16em] text-stone-500">
          {card.group}
        </p>
        <div className="rounded-md border border-stone-700 bg-stone-950/70 p-8">
          <p className="break-words text-5xl font-semibold leading-tight text-stone-50 sm:text-6xl">
            {card.prompt}
          </p>
          {romajiVisible && card.romaji ? (
            <p className="mt-4 text-lg text-stone-400">{card.romaji}</p>
          ) : null}
          <button
            type="button"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-600 bg-stone-900 px-4 text-sm font-medium text-stone-100 hover:bg-stone-800"
            onClick={() => speak(card.audioText ?? card.prompt)}
          >
            <Headphones aria-hidden="true" className="h-4 w-4" />
            Audio
          </button>
        </div>

        {!session.revealed ? (
          <button
            type="button"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-md bg-stone-100 px-5 font-semibold text-stone-950 hover:bg-teal-100"
            onClick={revealCard}
          >
            <Eye aria-hidden="true" className="h-4 w-4" />
            Reveal
          </button>
        ) : (
          <div className="mt-6">
            <div className="rounded-md border border-teal-200/15 bg-teal-200/8 p-5 text-left">
              {card.reading ? (
                <p className="text-lg text-teal-100">{card.reading}</p>
              ) : null}
              <p className="mt-2 text-2xl font-semibold text-stone-50">
                {card.meaning}
              </p>
              {card.notes ? (
                <p className="mt-3 text-stone-300">{card.notes}</p>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <RatingButton
                rating="hard"
                label="Hard"
                icon={AlertTriangle}
                onRate={rateCard}
              />
              <RatingButton
                rating="okay"
                label="Okay"
                icon={Check}
                onRate={rateCard}
              />
              <RatingButton
                rating="easy"
                label="Easy"
                icon={Check}
                onRate={rateCard}
              />
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function RatingButton({
  rating,
  label,
  icon: Icon,
  onRate,
}: {
  rating: CardRating;
  label: string;
  icon: typeof Check;
  onRate: (rating: CardRating) => void;
}) {
  const classes =
    rating === "hard"
      ? "border-rose-200/30 bg-rose-200/10 text-rose-100 hover:bg-rose-200/15"
      : rating === "easy"
        ? "border-teal-200/30 bg-teal-200/10 text-teal-100 hover:bg-teal-200/15"
        : "border-amber-200/30 bg-amber-200/10 text-amber-100 hover:bg-amber-200/15";

  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-4 font-semibold ${classes}`}
      onClick={() => onRate(rating)}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}

function ReadingStep({ reading }: { reading: ReadingItem }) {
  const completeReadingStep = useRecallStore(
    (state) => state.completeReadingStep,
  );
  const [showTranslation, setShowTranslation] = useState(false);
  const [showReading, setShowReading] = useState(false);

  return (
    <section className="grid flex-1 place-items-center rounded-md border border-stone-700/70 bg-[#101119]/90 p-5 sm:p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-stone-500">
              Tiny Reading
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-stone-50">
              {reading.title}
            </h3>
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-600 bg-stone-900 px-3 text-sm font-medium text-stone-100 hover:bg-stone-800"
            onClick={() => speak(reading.audioText ?? reading.text)}
          >
            <Headphones aria-hidden="true" className="h-4 w-4" />
            Audio
          </button>
        </div>

        <div className="rounded-md border border-stone-700 bg-stone-950/70 p-6">
          <p className="text-4xl font-semibold leading-relaxed text-stone-50">
            {reading.text}
          </p>
          {showReading ? (
            <p className="mt-5 text-xl text-teal-100">{reading.readingHelp}</p>
          ) : null}
          {showTranslation ? (
            <p className="mt-5 text-lg leading-8 text-stone-200">
              {reading.translation}
            </p>
          ) : null}
          {showTranslation && reading.notes ? (
            <p className="mt-4 border-t border-stone-700 pt-4 text-stone-400">
              {reading.notes}
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            className="min-h-11 rounded-md border border-stone-600 bg-stone-900 px-4 text-sm font-medium text-stone-100 hover:bg-stone-800"
            onClick={() => setShowReading((current) => !current)}
          >
            Reading Help
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-stone-600 bg-stone-900 px-4 text-sm font-medium text-stone-100 hover:bg-stone-800"
            onClick={() => setShowTranslation((current) => !current)}
          >
            Meaning
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-100 px-4 text-sm font-semibold text-stone-950 hover:bg-teal-100"
            onClick={completeReadingStep}
          >
            <Check aria-hidden="true" className="h-4 w-4" />
            Mark Read
          </button>
        </div>
      </div>
    </section>
  );
}

function SentenceStep({ template }: { template: SentenceTemplate }) {
  const saveSentenceStep = useRecallStore((state) => state.saveSentenceStep);
  const skipSentenceStep = useRecallStore((state) => state.skipSentenceStep);
  const [value, setValue] = useState("");

  return (
    <section className="grid flex-1 place-items-center rounded-md border border-stone-700/70 bg-[#101119]/90 p-5 sm:p-8">
      <div className="w-full max-w-2xl">
        <p className="text-sm uppercase tracking-[0.16em] text-stone-500">
          Optional Sentence
        </p>
        <h3 className="mt-2 text-3xl font-semibold text-stone-50">
          {template.prompt}
        </h3>
        <p className="mt-4 text-lg text-teal-100">{template.hint}</p>

        <label className="mt-6 block">
          <span className="sr-only">Typed sentence</span>
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-32 w-full resize-y rounded-md border border-stone-700 bg-stone-950/70 p-4 text-xl text-stone-50 outline-none placeholder:text-stone-600 focus:border-teal-200"
            placeholder={template.example}
          />
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-100 px-5 font-semibold text-stone-950 hover:bg-teal-100 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
            onClick={() => saveSentenceStep(value)}
            disabled={value.trim() === ""}
          >
            <PenLine aria-hidden="true" className="h-4 w-4" />
            Save Sentence
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-600 bg-stone-900 px-5 font-semibold text-stone-100 hover:bg-stone-800"
            onClick={skipSentenceStep}
          >
            <SkipForward aria-hidden="true" className="h-4 w-4" />
            Skip
          </button>
        </div>
      </div>
    </section>
  );
}

function SleepLanding({ session }: { session: StudySession }) {
  const closeForTonight = useRecallStore((state) => state.closeForTonight);
  const progress = useRecallStore((state) => state.progress);

  return (
    <section className="grid flex-1 place-items-center rounded-md border border-stone-700/70 bg-[#101119]/90 p-5 sm:p-8">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-teal-200/20 bg-teal-200/10 text-teal-100">
          <Moon aria-hidden="true" className="h-6 w-6" />
        </div>
        <h3 className="text-4xl font-semibold text-stone-50">
          Done for tonight. Go sleep.
        </h3>
        <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
          <SummaryItem
            label="Cards reviewed"
            value={`${session.reviewedCount}`}
          />
          <SummaryItem
            label="One thing remembered"
            value={
              session.remembered ?? progress.lastRemembered ?? "Showing up"
            }
          />
          <SummaryItem label="Next session" value="Tomorrow night" />
          <SummaryItem
            label="Session length"
            value={`${session.minutes} min`}
          />
        </div>
        <button
          type="button"
          className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-100 px-6 font-semibold text-stone-950 hover:bg-teal-100"
          onClick={closeForTonight}
        >
          <Moon aria-hidden="true" className="h-4 w-4" />
          Close for Tonight
        </button>
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-700 bg-stone-950/70 p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-stone-50">{value}</p>
    </div>
  );
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}
