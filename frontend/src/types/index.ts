export interface User {
  id: string;
  email?: string | null;
  username?: string | null;
  display_name?: string | null;
  roles?: string[];
  is_guest?: boolean;
  auth_type?: "frontpage" | "guest";
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

export type CardKind =
  | "target-meaning"
  | "target-reading-meaning"
  | "sentence-meaning"
  | "kana-recognition"
  | "audio-prompt";

export type CardStatus = "new" | "learning" | "review";
export type CardRating = "hard" | "okay" | "easy";

export interface RecallCard {
  id: string;
  kind: CardKind;
  prompt: string;
  reading?: string;
  meaning: string;
  notes?: string;
  group: string;
  audioText?: string;
  romaji?: string;
  status: CardStatus;
  dueAt: string;
  intervalDays: number;
  ease: number;
  reviews: number;
  lapses: number;
  lastReviewedAt?: string;
  lastRating?: CardRating;
  createdAt: string;
  updatedAt: string;
}

export interface CardDraft {
  id?: string;
  kind: CardKind;
  prompt: string;
  reading?: string;
  meaning: string;
  notes?: string;
  group: string;
  audioText?: string;
  romaji?: string;
}

export interface ReadingItem {
  id: string;
  title: string;
  text: string;
  readingHelp: string;
  translation: string;
  notes?: string;
  audioText?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingDraft {
  id?: string;
  title: string;
  text: string;
  readingHelp: string;
  translation: string;
  notes?: string;
  audioText?: string;
}

export interface SentenceTemplate {
  id: string;
  prompt: string;
  hint: string;
  example: string;
}

export interface TypedSentence {
  id: string;
  prompt: string;
  text: string;
  savedAt: string;
}

export interface RecallSettings {
  language: "Japanese";
  defaultSessionMinutes: number;
  customSessionMinutes: number;
  newCardLimit: number;
  romajiVisible: boolean;
  reducedMotion: boolean;
}

export interface RecallProgress {
  totalCardsReviewed: number;
  totalCorrect: number;
  totalHard: number;
  reviewedByDate: Record<string, number>;
  correctByDate: Record<string, number>;
  completedNightDates: string[];
  completedReadingIds: string[];
  typedSentences: TypedSentence[];
  lastSessionAt?: string;
  lastRemembered?: string;
}

export type SessionStep = "review" | "reading" | "sentence" | "done";

export interface StudySession {
  id: string;
  startedAt: string;
  expiresAt: string;
  minutes: number;
  tiredMode: boolean;
  cardIds: string[];
  currentCardIndex: number;
  revealed: boolean;
  readingId?: string;
  sentenceTemplateId?: string;
  step: SessionStep;
  reviewedCount: number;
  correctCount: number;
  hardCount: number;
  timeExpired: boolean;
  remembered?: string;
}

export interface RecallSnapshot {
  cards: RecallCard[];
  readings: ReadingItem[];
  sentenceTemplates: SentenceTemplate[];
  settings: RecallSettings;
  progress: RecallProgress;
}

export interface RecallDocument {
  state: RecallSnapshot;
  revision: number;
}

export type RecallIntentKind =
  | "start_session"
  | "review_card"
  | "complete_reading"
  | "save_sentence"
  | "complete_session";

export interface PendingRecallIntent {
  id: string;
  kind: RecallIntentKind;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ProgressSummary {
  reviewedToday: number;
  reviewAccuracy: number;
  familiarWords: number;
  shakyWords: number;
  upcomingReviews: number;
  nightsThisWeek: number;
  readingConfidence: number;
}
