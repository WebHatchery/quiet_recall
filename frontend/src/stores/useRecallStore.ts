import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { recallApi } from "../api/recallApi";
import {
  clearGuestSession,
  hasMergeableGuestSession,
  isGuestSessionActive,
  readAuthDisplayName,
  readAuthToken,
  readGuestSession,
  saveGuestSession,
} from "../api/sessionStorage";
import {
  defaultCards,
  defaultProgress,
  defaultReadings,
  defaultSentenceTemplates,
  defaultSettings,
} from "../data/japaneseSeed";
import type {
  CardDraft,
  CardRating,
  ProgressSummary,
  ReadingDraft,
  ReadingItem,
  RecallCard,
  RecallProgress,
  RecallSettings,
  RecallSnapshot,
  SentenceTemplate,
  StudySession,
} from "../types";
import { minutesFromNow, nowIso, todayKey } from "../utils/date";
import { summarizeProgress } from "../utils/progress";
import { scheduleCard, selectSessionCardIds } from "../utils/srs";

export type PortalView = "tonight" | "progress" | "library";

interface RecallStoreState extends RecallSnapshot {
  activeView: PortalView;
  activeSession: StudySession | null;
  tiredMode: boolean;
  selectedMinutes: number;
  isSyncing: boolean;
  syncError: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasMergeableGuestSession: boolean;
  authDisplayName: string | null;
  webHatcheryLoginUrl: string | null;
  progressSummary: () => ProgressSummary;
  setView: (view: PortalView) => void;
  setTiredMode: (enabled: boolean) => void;
  setSelectedMinutes: (minutes: number) => void;
  refreshAuthStatus: () => void;
  continueAsGuest: () => Promise<void>;
  mergeGuestSession: () => Promise<void>;
  visitWebHatcheryLogin: () => Promise<void>;
  loadRemoteState: () => Promise<void>;
  startSession: () => void;
  tickSession: () => void;
  revealCard: () => void;
  rateCard: (rating: CardRating) => void;
  completeReadingStep: () => void;
  saveSentenceStep: (text: string) => void;
  skipSentenceStep: () => void;
  finishSession: () => void;
  closeForTonight: () => void;
  updateSettings: (settings: Partial<RecallSettings>) => void;
  saveCard: (draft: CardDraft) => void;
  deleteCard: (cardId: string) => void;
  saveReading: (draft: ReadingDraft) => void;
  deleteReading: (readingId: string) => void;
  resetLocalData: () => void;
}

const initialSnapshot: RecallSnapshot = {
  cards: defaultCards,
  readings: defaultReadings,
  sentenceTemplates: defaultSentenceTemplates,
  settings: defaultSettings,
  progress: defaultProgress,
};

export const useRecallStore = create<RecallStoreState>()(
  persist(
    (set, get) => ({
      ...initialSnapshot,
      activeView: "tonight",
      activeSession: null,
      tiredMode: false,
      selectedMinutes: defaultSettings.defaultSessionMinutes,
      isSyncing: false,
      syncError: null,
      isAuthenticated: false,
      isGuest: false,
      hasMergeableGuestSession: false,
      authDisplayName: null,
      webHatcheryLoginUrl: null,

      progressSummary: () => summarizeProgress(get().cards, get().progress),

      setView: (activeView) => set({ activeView }),

      setTiredMode: (tiredMode) =>
        set((state) => ({
          tiredMode,
          selectedMinutes: tiredMode ? 5 : state.selectedMinutes,
        })),

      setSelectedMinutes: (selectedMinutes) =>
        set((state) => ({
          selectedMinutes: Math.max(1, Math.min(15, selectedMinutes)),
          tiredMode:
            state.tiredMode && selectedMinutes > 5 ? false : state.tiredMode,
        })),

      refreshAuthStatus: () => {
        set(authStatus());
      },

      continueAsGuest: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          const session = await recallApi.createGuestSession();
          saveGuestSession(session.token, session.user);
          const snapshot = snapshotFromState(get());
          await recallApi.saveState(snapshot);
          set({
            ...authStatus(),
            isSyncing: false,
            syncError: null,
          });
        } catch (error: unknown) {
          set({
            ...authStatus(),
            isSyncing: false,
            syncError: messageFromError(error),
          });
        }
      },

      mergeGuestSession: async () => {
        const guestToken = readGuestSession()?.token;
        if (!guestToken) {
          set(authStatus());
          return;
        }

        set({ isSyncing: true, syncError: null });
        try {
          const payload = await recallApi.linkGuestAccount(guestToken);
          clearGuestSession();
          set({
            ...payload.state,
            ...authStatus(),
            isSyncing: false,
            syncError: null,
          });
        } catch (error: unknown) {
          set({
            ...authStatus(),
            isSyncing: false,
            syncError: messageFromError(error),
          });
        }
      },

      visitWebHatcheryLogin: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          const { login_url: loginUrl } = await recallApi.getLoginInfo();
          const targetUrl = withReturnTo(loginUrl);
          set({ webHatcheryLoginUrl: targetUrl, isSyncing: false });
          window.location.assign(targetUrl);
        } catch (error: unknown) {
          set({ isSyncing: false, syncError: messageFromError(error) });
        }
      },

      loadRemoteState: async () => {
        if (!readAuthToken()) {
          set(authStatus());
          return;
        }

        set({ isSyncing: true, syncError: null });
        try {
          const snapshot = await recallApi.loadState();
          set({
            ...snapshot,
            ...authStatus(),
            isSyncing: false,
            syncError: null,
          });
        } catch (error: unknown) {
          set({
            ...authStatus(),
            isSyncing: false,
            syncError: messageFromError(error),
          });
        }
      },

      startSession: () => {
        const state = get();
        const minutes = state.tiredMode ? 5 : state.selectedMinutes;
        const cardIds = selectSessionCardIds(
          state.cards,
          minutes,
          state.tiredMode,
          state.settings.newCardLimit,
        );
        const reading = state.tiredMode
          ? undefined
          : selectReading(state.readings, state.progress);
        const template = state.tiredMode
          ? undefined
          : selectSentenceTemplate(state.sentenceTemplates, state.progress);
        const step =
          cardIds.length > 0 ? "review" : state.tiredMode ? "done" : "reading";

        const activeSession: StudySession = {
          id: crypto.randomUUID(),
          startedAt: nowIso(),
          expiresAt: minutesFromNow(minutes),
          minutes,
          tiredMode: state.tiredMode,
          cardIds,
          currentCardIndex: 0,
          revealed: false,
          readingId: reading?.id,
          sentenceTemplateId: template?.id,
          step,
          reviewedCount: 0,
          correctCount: 0,
          hardCount: 0,
          timeExpired: false,
        };

        set({
          activeView: "tonight",
          activeSession,
        });

        if (step === "done") {
          get().finishSession();
        }
      },

      tickSession: () => {
        const session = get().activeSession;
        if (!session || session.step === "done" || session.timeExpired) {
          return;
        }

        if (new Date(session.expiresAt).getTime() <= Date.now()) {
          set({
            activeSession: {
              ...session,
              timeExpired: true,
            },
          });
        }
      },

      revealCard: () =>
        set((state) => ({
          activeSession: state.activeSession
            ? {
                ...state.activeSession,
                revealed: true,
              }
            : null,
        })),

      rateCard: (rating) => {
        const state = get();
        const session = state.activeSession;
        if (!session || session.step !== "review") {
          return;
        }

        const cardId = session.cardIds[session.currentCardIndex];
        const card = state.cards.find((candidate) => candidate.id === cardId);
        if (!card) {
          return;
        }

        const scheduledCard = scheduleCard(card, rating);
        const nextIndex = session.currentCardIndex + 1;
        const sessionDone = nextIndex >= session.cardIds.length;
        const nextStep = sessionDone
          ? session.tiredMode || session.timeExpired
            ? "done"
            : "reading"
          : "review";
        const remembered =
          rating === "easy" || rating === "okay"
            ? `${card.prompt} - ${card.meaning}`
            : session.remembered;

        set((current) => ({
          cards: current.cards.map((candidate) =>
            candidate.id === cardId ? scheduledCard : candidate,
          ),
          progress: recordCardReview(current.progress, rating),
          activeSession: {
            ...session,
            currentCardIndex: nextIndex,
            revealed: false,
            step: nextStep,
            reviewedCount: session.reviewedCount + 1,
            correctCount: session.correctCount + (rating === "hard" ? 0 : 1),
            hardCount: session.hardCount + (rating === "hard" ? 1 : 0),
            remembered,
          },
        }));

        void pushSnapshot(get, set);

        if (nextStep === "done") {
          get().finishSession();
        }
      },

      completeReadingStep: () => {
        const session = get().activeSession;
        if (!session || session.step !== "reading" || !session.readingId) {
          return;
        }

        const readingId = session.readingId;
        set((state) => ({
          readings: state.readings.map((reading) =>
            reading.id === readingId
              ? { ...reading, completedAt: nowIso(), updatedAt: nowIso() }
              : reading,
          ),
          progress: recordReadingComplete(state.progress, readingId),
          activeSession: {
            ...session,
            step: session.timeExpired ? "done" : "sentence",
          },
        }));

        void pushSnapshot(get, set);

        if (get().activeSession?.step === "done") {
          get().finishSession();
        }
      },

      saveSentenceStep: (text) => {
        const session = get().activeSession;
        const template = get().sentenceTemplates.find(
          (candidate) => candidate.id === session?.sentenceTemplateId,
        );
        if (!session || session.step !== "sentence" || text.trim() === "") {
          return;
        }

        set((state) => ({
          progress: {
            ...state.progress,
            typedSentences: [
              {
                id: crypto.randomUUID(),
                prompt: template?.prompt ?? "Typed sentence",
                text: text.trim(),
                savedAt: nowIso(),
              },
              ...state.progress.typedSentences,
            ].slice(0, 20),
          },
          activeSession: {
            ...session,
            step: "done",
          },
        }));

        void pushSnapshot(get, set);
        get().finishSession();
      },

      skipSentenceStep: () => {
        const session = get().activeSession;
        if (!session || session.step !== "sentence") {
          return;
        }

        set({
          activeSession: {
            ...session,
            step: "done",
          },
        });
        get().finishSession();
      },

      finishSession: () => {
        const session = get().activeSession;
        if (!session) {
          return;
        }

        const tonight = todayKey();
        set((state) => ({
          progress: {
            ...state.progress,
            completedNightDates: state.progress.completedNightDates.includes(
              tonight,
            )
              ? state.progress.completedNightDates
              : [...state.progress.completedNightDates, tonight],
            lastSessionAt: nowIso(),
            lastRemembered: session.remembered ?? state.progress.lastRemembered,
          },
          activeSession: {
            ...session,
            step: "done",
          },
        }));

        void pushSnapshot(get, set);
      },

      closeForTonight: () => {
        set({
          activeSession: null,
          activeView: "tonight",
        });
      },

      updateSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings,
          },
          selectedMinutes:
            settings.defaultSessionMinutes ??
            settings.customSessionMinutes ??
            state.selectedMinutes,
        }));
        void pushSnapshot(get, set);
      },

      saveCard: (draft) => {
        const timestamp = nowIso();
        set((state) => {
          const existing = draft.id
            ? state.cards.find((candidate) => candidate.id === draft.id)
            : undefined;
          const nextCard: RecallCard = {
            id: existing?.id ?? `card-${crypto.randomUUID()}`,
            kind: draft.kind,
            prompt: draft.prompt.trim(),
            reading: optionalText(draft.reading),
            meaning: draft.meaning.trim(),
            notes: optionalText(draft.notes),
            group: draft.group.trim() || "Manual",
            audioText: optionalText(draft.audioText),
            romaji: optionalText(draft.romaji),
            status: existing?.status ?? "new",
            dueAt: existing?.dueAt ?? timestamp,
            intervalDays: existing?.intervalDays ?? 0,
            ease: existing?.ease ?? 2.3,
            reviews: existing?.reviews ?? 0,
            lapses: existing?.lapses ?? 0,
            lastReviewedAt: existing?.lastReviewedAt,
            lastRating: existing?.lastRating,
            createdAt: existing?.createdAt ?? timestamp,
            updatedAt: timestamp,
          };

          return {
            cards: existing
              ? state.cards.map((card) =>
                  card.id === nextCard.id ? nextCard : card,
                )
              : [nextCard, ...state.cards],
          };
        });
        void pushSnapshot(get, set);
      },

      deleteCard: (cardId) => {
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== cardId),
          activeSession:
            state.activeSession && state.activeSession.cardIds.includes(cardId)
              ? null
              : state.activeSession,
        }));
        void pushSnapshot(get, set);
      },

      saveReading: (draft) => {
        const timestamp = nowIso();
        set((state) => {
          const existing = draft.id
            ? state.readings.find((candidate) => candidate.id === draft.id)
            : undefined;
          const nextReading: ReadingItem = {
            id: existing?.id ?? `reading-${crypto.randomUUID()}`,
            title: draft.title.trim(),
            text: draft.text.trim(),
            readingHelp: draft.readingHelp.trim(),
            translation: draft.translation.trim(),
            notes: optionalText(draft.notes),
            audioText: optionalText(draft.audioText),
            completedAt: existing?.completedAt,
            createdAt: existing?.createdAt ?? timestamp,
            updatedAt: timestamp,
          };

          return {
            readings: existing
              ? state.readings.map((reading) =>
                  reading.id === nextReading.id ? nextReading : reading,
                )
              : [nextReading, ...state.readings],
          };
        });
        void pushSnapshot(get, set);
      },

      deleteReading: (readingId) => {
        set((state) => ({
          readings: state.readings.filter(
            (reading) => reading.id !== readingId,
          ),
          progress: {
            ...state.progress,
            completedReadingIds: state.progress.completedReadingIds.filter(
              (id) => id !== readingId,
            ),
          },
        }));
        void pushSnapshot(get, set);
      },

      resetLocalData: () => {
        set({
          ...initialSnapshot,
          activeSession: null,
          selectedMinutes: defaultSettings.defaultSessionMinutes,
          tiredMode: false,
        });
        void pushSnapshot(get, set);
      },
    }),
    {
      name: "quiet-recall-state",
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        cards: state.cards,
        readings: state.readings,
        sentenceTemplates: state.sentenceTemplates,
        settings: state.settings,
        progress: state.progress,
        activeSession: state.activeSession,
        tiredMode: state.tiredMode,
        selectedMinutes: state.selectedMinutes,
      }),
    },
  ),
);

function snapshotFromState(state: RecallStoreState): RecallSnapshot {
  return {
    cards: state.cards,
    readings: state.readings,
    sentenceTemplates: state.sentenceTemplates,
    settings: state.settings,
    progress: state.progress,
  };
}

async function pushSnapshot(
  get: () => RecallStoreState,
  set: (partial: Partial<RecallStoreState>) => void,
): Promise<void> {
  if (!readAuthToken()) {
    return;
  }

  set({ isSyncing: true, syncError: null });
  try {
    await recallApi.saveState(snapshotFromState(get()));
    set({ isSyncing: false, syncError: null });
  } catch (error: unknown) {
    set({ isSyncing: false, syncError: messageFromError(error) });
  }
}

function authStatus(): Pick<
  RecallStoreState,
  "isAuthenticated" | "isGuest" | "hasMergeableGuestSession" | "authDisplayName"
> {
  return {
    isAuthenticated: Boolean(readAuthToken()),
    isGuest: isGuestSessionActive(),
    hasMergeableGuestSession: hasMergeableGuestSession(),
    authDisplayName: readAuthDisplayName(),
  };
}

function recordCardReview(
  progress: RecallProgress,
  rating: CardRating,
): RecallProgress {
  const today = todayKey();
  const reviewedToday = progress.reviewedByDate[today] ?? 0;
  const correctToday = progress.correctByDate[today] ?? 0;

  return {
    ...progress,
    totalCardsReviewed: progress.totalCardsReviewed + 1,
    totalCorrect: progress.totalCorrect + (rating === "hard" ? 0 : 1),
    totalHard: progress.totalHard + (rating === "hard" ? 1 : 0),
    reviewedByDate: {
      ...progress.reviewedByDate,
      [today]: reviewedToday + 1,
    },
    correctByDate: {
      ...progress.correctByDate,
      [today]: correctToday + (rating === "hard" ? 0 : 1),
    },
  };
}

function recordReadingComplete(
  progress: RecallProgress,
  readingId: string,
): RecallProgress {
  return {
    ...progress,
    completedReadingIds: progress.completedReadingIds.includes(readingId)
      ? progress.completedReadingIds
      : [...progress.completedReadingIds, readingId],
  };
}

function selectReading(
  readings: ReadingItem[],
  progress: RecallProgress,
): ReadingItem | undefined {
  return (
    readings.find(
      (reading) => !progress.completedReadingIds.includes(reading.id),
    ) ?? readings[0]
  );
}

function selectSentenceTemplate(
  templates: SentenceTemplate[],
  progress: RecallProgress,
): SentenceTemplate | undefined {
  if (templates.length === 0) {
    return undefined;
  }

  return templates[progress.typedSentences.length % templates.length];
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

function withReturnTo(loginUrl: string): string {
  const trimmed = loginUrl.trim();
  const normalized =
    /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")
      ? trimmed
      : `https://${trimmed}`;
  const url = new URL(normalized, window.location.origin);
  url.searchParams.set("return_to", window.location.href);
  return url.toString();
}
