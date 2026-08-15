import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../src/api/client", () => ({
  default: api,
  toApiError: (error: unknown) => error,
}));

import { recallApi } from "../src/api/recallApi";

describe("recallApi intent contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({
      status: 200,
      data: { success: true, data: { state: {}, revision: 2 } },
    });
    api.put.mockResolvedValue({
      status: 200,
      data: { success: true, data: { state: {}, revision: 2 } },
    });
  });

  it("sends the durable intent id as the idempotency key", async () => {
    await recallApi.reviewCard(
      "kana-a",
      "easy",
      "b8f52cad-02ff-4662-a742-4534ee22f55b",
    );

    expect(api.post).toHaveBeenCalledWith(
      "/study/card/review",
      { card_id: "kana-a", rating: "easy" },
      {
        headers: {
          "Idempotency-Key": "b8f52cad-02ff-4662-a742-4534ee22f55b",
        },
      },
    );
  });

  it("requires the known revision for a legacy snapshot import", async () => {
    const state = {
      cards: [],
      readings: [],
      sentenceTemplates: [],
      settings: {},
      progress: {},
    };
    await recallApi.importLegacyState(state as never, 7);

    expect(api.put).toHaveBeenCalledWith("/study/state", {
      state,
      expected_revision: 7,
    });
  });
});
