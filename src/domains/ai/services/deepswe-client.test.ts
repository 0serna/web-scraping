import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockServiceModuleDependencies } from "../../../shared/test-utils/service-test-helpers.js";
import { matchDeepSweScore } from "./deepswe-client.js";
import type { DeepSweScore } from "../types/ranking.js";

describe("matchDeepSweScore", () => {
  const scores: DeepSweScore[] = [
    { model: "gpt-5-5", effort: "high", score: 64 },
    { model: "gpt-5-5", effort: "xhigh", score: 67 },
    { model: "gpt-5-5", effort: "medium", score: 54 },
    { model: "claude-opus-4-8", effort: "high", score: 52 },
    { model: "claude-fable-5", effort: "xhigh", score: 70 },
    { model: "kimi-k2-7-code", effort: null, score: 31 },
    { model: "gemini-3-5-flash", effort: "medium", score: 37 },
  ];

  it("matches exact model and effort", () => {
    expect(matchDeepSweScore("gpt-5.5 [high]", scores)).toBe(64);
    expect(matchDeepSweScore("gpt-5.5 [xhigh]", scores)).toBe(67);
    expect(matchDeepSweScore("claude-opus-4.8 [high]", scores)).toBe(52);
  });

  it("returns null when no match found", () => {
    expect(matchDeepSweScore("unknown-model [high]", scores)).toBeNull();
  });

  it("returns null when effort does not match", () => {
    expect(matchDeepSweScore("gpt-5.5 [low]", scores)).toBeNull();
  });

  it("finds best score when no effort specified in slug", () => {
    // gpt-5.5 has scores 64 (high), 67 (xhigh), 54 (medium)
    expect(matchDeepSweScore("gpt-5.5", scores)).toBe(67);
  });

  it("matches Artificial Analysis effort suffixes against DeepSWE efforts", () => {
    expect(matchDeepSweScore("gpt-5-5-medium", scores)).toBe(54);
  });

  it("matches model without effort to model with null effort", () => {
    expect(matchDeepSweScore("kimi-k2.7-code", scores)).toBe(31);
  });

  it("normalizes model names with hyphens to dots", () => {
    expect(matchDeepSweScore("gpt-5-5 [high]", scores)).toBe(64);
    expect(matchDeepSweScore("gpt-5-5 [xhigh]", scores)).toBe(67);
  });

  it("performs case-insensitive matching", () => {
    expect(matchDeepSweScore("GPT-5.5 [HIGH]", scores)).toBe(64);
    expect(matchDeepSweScore("gpt-5.5 [HIGH]", scores)).toBe(64);
    expect(matchDeepSweScore("GPT-5.5 [high]", scores)).toBe(64);
  });

  it("rounds pass_rate to integer percentage", () => {
    const scoresWithDecimal: DeepSweScore[] = [
      { model: "test-model", effort: null, score: 65 }, // 0.6487 * 100 ≈ 65
    ];
    expect(matchDeepSweScore("test-model", scoresWithDecimal)).toBe(65);
  });
});

async function loadDeepSweClient() {
  vi.resetModules();

  const mocks = mockServiceModuleDependencies<DeepSweScore[]>();

  const { DeepSweClient } = await import("./deepswe-client.js");

  return {
    DeepSweClient,
    fetchWithTimeout: mocks.fetchWithTimeout,
  };
}

describe("DeepSweClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses v1.1 scores first and fills missing scores from v1", async () => {
    const { DeepSweClient, fetchWithTimeout } = await loadDeepSweClient();

    const v11Data = {
      rows: [{ model: "gpt-5-5", reasoning_effort: "high", pass_rate: 0.64 }],
    };
    const v1Data = {
      rows: [
        { model: "gpt-5-5", reasoning_effort: "high", pass_rate: 0.62 },
        { model: "mimo-v2-5-pro", reasoning_effort: null, pass_rate: 0.19 },
      ],
    };

    fetchWithTimeout
      .mockResolvedValueOnce(
        new Response(JSON.stringify(v11Data), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(v1Data), { status: 200 }),
      );

    const client = new DeepSweClient({ child: vi.fn() } as never);
    const scores = await client.getScores();

    expect(scores).toEqual([
      { model: "gpt-5-5", effort: "high", score: 64 },
      { model: "mimo-v2-5-pro", effort: null, score: 19 },
    ]);
    expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
  });

  it("falls back to v1 when v1.1 fetch fails", async () => {
    const { DeepSweClient, fetchWithTimeout } = await loadDeepSweClient();

    const v1Data = {
      rows: [
        { model: "gpt-5-5", reasoning_effort: "high", pass_rate: 0.62 },
        { model: "gpt-5-5", reasoning_effort: "xhigh", pass_rate: 0.7 },
      ],
    };

    // First call (v1.1) fails, second call (v1) succeeds
    fetchWithTimeout
      .mockRejectedValueOnce(new Error("v1.1 failed"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(v1Data), { status: 200 }),
      );

    const client = new DeepSweClient({ child: vi.fn() } as never);
    const scores = await client.getScores();

    expect(scores).toEqual([
      { model: "gpt-5-5", effort: "high", score: 62 },
      { model: "gpt-5-5", effort: "xhigh", score: 70 },
    ]);
    expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
  });

  it("returns empty array when all versions fail", async () => {
    const { DeepSweClient, fetchWithTimeout } = await loadDeepSweClient();

    fetchWithTimeout.mockRejectedValue(new Error("network error"));

    const client = new DeepSweClient({ child: vi.fn() } as never);
    const scores = await client.getScores();

    expect(scores).toEqual([]);
    expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
  });
});
