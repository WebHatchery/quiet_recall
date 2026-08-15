import api, { toApiError } from "./client";
import type { ApiEnvelope } from "./types";
import type {
  CardRating,
  PendingRecallIntent,
  RecallCard,
  RecallDocument,
  RecallSnapshot,
  ReadingItem,
  StudySession,
  User,
} from "../types";

type HttpMethod = "get" | "post" | "put" | "delete";

async function request<T>(
  method: HttpMethod,
  url: string,
  payload?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const config = idempotencyKey
    ? { headers: { "Idempotency-Key": idempotencyKey } }
    : undefined;
  try {
    const response =
      method === "get"
        ? await api.get<ApiEnvelope<T>>(url)
        : method === "post"
          ? await api.post<ApiEnvelope<T>>(url, payload, config)
          : method === "put"
            ? await api.put<ApiEnvelope<T>>(url, payload)
            : await api.delete<ApiEnvelope<T>>(url);

    if (!response.data.success) {
      throw toApiError({
        response: {
          status: response.status,
          data: response.data,
        },
      });
    }

    return response.data.data as T;
  } catch (error: unknown) {
    throw toApiError(error);
  }
}

export const recallApi = {
  getLoginInfo: () => request<{ login_url: string }>("get", "/auth/login-info"),
  createGuestSession: () =>
    request<{
      token: string;
      user: User;
    }>("post", "/auth/guest-session"),
  linkGuestAccount: (
    guestToken: string,
    mergeStrategy: "merge" | "keep_guest" | "keep_account",
  ) =>
    request<{
      merged: boolean;
      state: RecallSnapshot;
      revision: number;
    }>("post", "/auth/link-guest", {
      guest_token: guestToken,
      merge_strategy: mergeStrategy,
    }),
  loadState: () => request<RecallDocument>("get", "/study/state"),
  importLegacyState: (snapshot: RecallSnapshot, expectedRevision: number) =>
    request<RecallDocument>("put", "/study/state", {
      state: snapshot,
      expected_revision: expectedRevision,
    }),
  startSession: (
    minutes: number,
    tiredMode: boolean,
    newCardLimit: number,
    idempotencyKey: string,
  ) =>
    request<RecallDocument & { session: StudySession }>(
      "post",
      "/study/session/start",
      {
        minutes,
        tired_mode: tiredMode,
        new_card_limit: newCardLimit,
      },
      idempotencyKey,
    ),
  reviewCard: (cardId: string, rating: CardRating, idempotencyKey: string) =>
    request<RecallDocument & { card: RecallCard }>(
      "post",
      "/study/card/review",
      {
        card_id: cardId,
        rating,
      },
      idempotencyKey,
    ),
  completeReading: (readingId: string, idempotencyKey: string) =>
    request<RecallDocument & { reading: ReadingItem }>(
      "post",
      "/study/reading/complete",
      {
        reading_id: readingId,
      },
      idempotencyKey,
    ),
  saveSentence: (prompt: string, text: string, idempotencyKey: string) =>
    request<RecallDocument>(
      "post",
      "/study/sentence",
      {
        prompt,
        text,
      },
      idempotencyKey,
    ),
  completeSession: (session: StudySession, idempotencyKey: string) =>
    request<RecallDocument>(
      "post",
      "/study/session/complete",
      {
        session,
      },
      idempotencyKey,
    ),
  sendIntent: (intent: PendingRecallIntent) => {
    const payload = intent.payload;
    switch (intent.kind) {
      case "start_session":
        return recallApi.startSession(
          Number(payload.minutes),
          Boolean(payload.tired_mode),
          Number(payload.new_card_limit),
          intent.id,
        );
      case "review_card":
        return recallApi.reviewCard(
          String(payload.card_id),
          payload.rating as CardRating,
          intent.id,
        );
      case "complete_reading":
        return recallApi.completeReading(String(payload.reading_id), intent.id);
      case "save_sentence":
        return recallApi.saveSentence(
          String(payload.prompt ?? ""),
          String(payload.text ?? ""),
          intent.id,
        );
      case "complete_session":
        return recallApi.completeSession(
          payload.session as unknown as StudySession,
          intent.id,
        );
    }
  },
};
