import api, { toApiError } from "./client";
import type { ApiEnvelope } from "./types";
import type {
  CardRating,
  RecallCard,
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
): Promise<T> {
  try {
    const response =
      method === "get"
        ? await api.get<ApiEnvelope<T>>(url)
        : method === "post"
          ? await api.post<ApiEnvelope<T>>(url, payload)
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
  linkGuestAccount: (guestToken: string) =>
    request<{
      merged: boolean;
      state: RecallSnapshot;
    }>("post", "/auth/link-guest", { guest_token: guestToken }),
  loadState: () => request<RecallSnapshot>("get", "/study/state"),
  saveState: (snapshot: RecallSnapshot) =>
    request<RecallSnapshot>("put", "/study/state", snapshot),
  startSession: (minutes: number, tiredMode: boolean, newCardLimit: number) =>
    request<{ state: RecallSnapshot; session: StudySession }>(
      "post",
      "/study/session/start",
      {
        minutes,
        tired_mode: tiredMode,
        new_card_limit: newCardLimit,
      },
    ),
  reviewCard: (cardId: string, rating: CardRating) =>
    request<{ state: RecallSnapshot; card: RecallCard }>(
      "post",
      "/study/card/review",
      {
        card_id: cardId,
        rating,
      },
    ),
  completeReading: (readingId: string) =>
    request<{ state: RecallSnapshot; reading: ReadingItem }>(
      "post",
      "/study/reading/complete",
      {
        reading_id: readingId,
      },
    ),
  saveSentence: (prompt: string, text: string) =>
    request<RecallSnapshot>("post", "/study/sentence", {
      prompt,
      text,
    }),
  completeSession: (session: StudySession) =>
    request<RecallSnapshot>("post", "/study/session/complete", {
      session,
    }),
};
