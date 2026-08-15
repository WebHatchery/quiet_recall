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
  PendingRecallIntent,
  ProgressSummary,
  ReadingDraft,
  ReadingItem,
  RecallCard,
  RecallDocument,
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
  revision: number;
  pendingIntents: PendingRecallIntent[];
  legacyImportPending: boolean;
  isFlushingIntents: boolean;
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
  mergeGuestSession: (
    strategy: "merge" | "keep_guest" | "keep_account",
  ) => Promise<void>;
  importLegacyProgress: () => Promise<void>;
  discardLegacyProgress: () => Promise<void>;
  flushPendingIntents: () => Promise<void>;
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
      revision: 0,
      pendingIntents: [],
      legacyImportPending: false,
      isFlushingIntents: false,
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
          const document = await recallApi.loadState();
          const preserveLegacyState = get().legacyImportPending;
          set({
            ...(preserveLegacyState ? {} : document.state),
            revision: document.revision,
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

      mergeGuestSession: async (strategy) => {
        const guestToken = readGuestSession()?.token;
        if (!guestToken) {
          set(authStatus());
          return;
        }

        set({ isSyncing: true, syncError: null });
        try {
          const payload = await recallApi.linkGuestAccount(
            guestToken,
            strategy,
          );
          clearGuestSession();
          set({
            ...payload.state,
            revision: payload.revision,
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
          const document = await recallApi.loadState();
          set({
            ...document.state,
            revision: document.revision,
            ...authStatus(),
            isSyncing: false,
            syncError: null,
          });
          await get().flushPendingIntents();
        } catch (error: unknown) {
          set({
            ...authStatus(),
            isSyncing: false,
            syncError: messageFromError(error),
          });
        }
      },

      importLegacyProgress: async () => {
        if (!readAuthToken() || get().revision < 1) {
          return;
        }
        set({ isSyncing: true, syncError: null });
        try {
          const document = await recallApi.importLegacyState(
            snapshotFromState(get()),
            get().revision,
          );
          set({
            ...document.state,
            revision: document.revision,
            legacyImportPending: false,
            isSyncing: false,
          });
        } catch (error: unknown) {
          set({ isSyncing: false, syncError: messageFromError(error) });
        }
      },

      discardLegacyProgress: async () => {
        set({ legacyImportPending: false });
        await get().loadRemoteState();
      },

      flushPendingIntents: () => flushIntentQueue(get, set),

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

        void enqueueIntent(get, set, "start_session", {
          minutes,
          tired_mode: state.tiredMode,
          new_card_limit: state.settings.newCardLimit,
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

        void enqueueIntent(get, set, "review_card", {
          card_id: cardId,
          rating,
        });

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

        void enqueueIntent(get, set, "complete_reading", {
          reading_id: readingId,
        });

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

        void enqueueIntent(get, set, "save_sentence", {
          prompt: template?.prompt ?? "Typed sentence",
          text: text.trim(),
        });
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

        void enqueueIntent(get, set, "complete_session", { session });
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
      },

      deleteCard: (cardId) => {
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== cardId),
          activeSession:
            state.activeSession && state.activeSession.cardIds.includes(cardId)
              ? null
              : state.activeSession,
        }));
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
      },

      resetLocalData: () => {
        set({
          ...initialSnapshot,
          activeSession: null,
          selectedMinutes: defaultSettings.defaultSessionMinutes,
          tiredMode: false,
        });
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
        revision: state.revision,
        pendingIntents: state.pendingIntents,
        legacyImportPending: state.legacyImportPending,
      }),
      version: 1,
      migrate: (persistedState, version) => {
        const persisted = persistedState as Partial<RecallStoreState>;
        if (version === 0) {
          return {
            ...persisted,
            revision: 0,
            pendingIntents: [],
            legacyImportPending: true,
          } as RecallStoreState;
        }
        return persisted as RecallStoreState;
      },
      onRehydrateStorage: () => (state) => {
        if (state && state.pendingIntents.length > 0) {
          queueMicrotask(() => void state.flushPendingIntents());
        }
      },
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

type RecallStoreSet = (
  partial:
    | Partial<RecallStoreState>
    | ((state: RecallStoreState) => Partial<RecallStoreState>),
) => void;

async function enqueueIntent(
  get: () => RecallStoreState,
  set: RecallStoreSet,
  kind: PendingRecallIntent["kind"],
  payload: Record<string, unknown>,
): Promise<void> {
  if (!readAuthToken()) {
    return;
  }

  const intent: PendingRecallIntent = {
    id: crypto.randomUUID(),
    kind,
    payload,
    createdAt: nowIso(),
  };
  set((state) => ({ pendingIntents: [...state.pendingIntents, intent] }));
  await flushIntentQueue(get, set);
}

async function flushIntentQueue(
  get: () => RecallStoreState,
  set: RecallStoreSet,
): Promise<void> {
  if (!readAuthToken() || get().isFlushingIntents) {
    return;
  }

  set({ isFlushingIntents: true, isSyncing: true, syncError: null });
  while (get().pendingIntents.length > 0) {
    const intent = get().pendingIntents[0];
    try {
      const response = await recallApi.sendIntent(intent);
      set((state) => ({
        ...applyIntentResponse(state, intent, response),
        revision: response.revision,
        pendingIntents: state.pendingIntents.filter(
          (candidate) => candidate.id !== intent.id,
        ),
        syncError: null,
      }));
    } catch (error: unknown) {
      set({ syncError: messageFromError(error) });
      break;
    }
  }
  set({ isFlushingIntents: false, isSyncing: false });
}

function applyIntentResponse(
  state: RecallStoreState,
  intent: PendingRecallIntent,
  response: RecallDocument & {
    card?: unknown;
    reading?: unknown;
    session?: unknown;
  },
): Partial<RecallStoreState> {
  switch (intent.kind) {
    case "start_session":
      return response.session && state.activeSession?.reviewedCount === 0
        ? { activeSession: response.session as StudySession }
        : {};
    case "review_card": {
      const card = response.card as RecallCard | undefined;
      return {
        cards: card
          ? state.cards.map((candidate) =>
              candidate.id === card.id ? card : candidate,
            )
          : state.cards,
        progress: response.state.progress,
      };
    }
    case "complete_reading": {
      const reading = response.reading as ReadingItem | undefined;
      return {
        readings: reading
          ? state.readings.map((candidate) =>
              candidate.id === reading.id ? reading : candidate,
            )
          : state.readings,
        progress: response.state.progress,
      };
    }
    case "save_sentence":
    case "complete_session":
      return { progress: response.state.progress };
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

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void useRecallStore.getState().flushPendingIntents();
  });
}
