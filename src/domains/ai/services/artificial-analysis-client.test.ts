import { describe, expect, it, vi } from "vitest";
import { createServiceModuleMocks } from "../../../shared/test-utils/service-test-helpers.js";
import type { ArtificialAnalysisModel } from "../types/ranking.js";

interface HtmlPayloadOptions {
  channel?: number;
  spacedPushFormat?: boolean;
  spacedModelsKey?: boolean;
}

function buildHtmlWithModels(
  models: unknown[],
  options: HtmlPayloadOptions = {},
): string {
  const {
    channel = 1,
    spacedPushFormat = false,
    spacedModelsKey = false,
  } = options;

  const decodedChunk = spacedModelsKey
    ? `b:{"models" : ${JSON.stringify(models)}}`
    : `b:${JSON.stringify({ models })}`;
  const encodedChunk = JSON.stringify(decodedChunk).slice(1, -1);

  if (spacedPushFormat) {
    return `<html><body><script>self.__next_f.push([ ${channel} , "${encodedChunk}" ])</script></body></html>`;
  }

  return `<html><body><script>self.__next_f.push([${channel},"${encodedChunk}"])</script></body></html>`;
}

function encodeChunk(decodedChunk: string, channel: number): string {
  const encodedChunk = JSON.stringify(decodedChunk).slice(1, -1);
  return `<script>self.__next_f.push([${channel},"${encodedChunk}"])</script>`;
}

function buildHtmlWithSeparateChunks(
  metadataModels: unknown[],
  performanceModels: unknown[],
): string {
  // Metadata chunk (like chunk 31 from the actual site)
  const metadataChunk = `b:${JSON.stringify({ models: metadataModels })}`;

  const performanceChunkContent = `b:${performanceModels.map((model) => JSON.stringify(model)).join(",")}`;

  return `<html><body>
    ${encodeChunk(metadataChunk, 1)}
    ${encodeChunk(performanceChunkContent, 2)}
  </body></html>`;
}

function buildHtmlWithEmbeddedPerformanceModels(models: unknown[]): string {
  const embeddedPayload = JSON.stringify({ models }).replace(/"/g, '\\"');
  return `<html><body><script>${embeddedPayload}</script></body></html>`;
}

async function loadArtificialAnalysisClient(
  getOrFetchValidatedImpl?: (
    key: string,
    fetcher: () => Promise<ArtificialAnalysisModel[]>,
    validator: (value: ArtificialAnalysisModel[]) => boolean,
  ) => Promise<ArtificialAnalysisModel[]>,
) {
  vi.resetModules();

  const mocks = createServiceModuleMocks<ArtificialAnalysisModel[]>(
    getOrFetchValidatedImpl,
  );

  vi.doMock("../../../shared/utils/cache-factory.js", () => ({
    createCache: mocks.createCache,
  }));

  vi.doMock("../../../shared/utils/api-helpers.js", () => ({
    fetchWithTimeout: mocks.fetchWithTimeout,
    buildFetchHeaders: mocks.buildFetchHeaders,
  }));

  const { ArtificialAnalysisClient } =
    await import("./artificial-analysis-client.js");

  return {
    ArtificialAnalysisClient,
    getOrFetchValidated: mocks.getOrFetchValidated,
    fetchWithTimeout: mocks.fetchWithTimeout,
  };
}

async function parseModelsFromHtml(
  html: string,
): Promise<ArtificialAnalysisModel[]> {
  const { ArtificialAnalysisClient, fetchWithTimeout } =
    await loadArtificialAnalysisClient();

  fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

  const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
  return client.getModels();
}

function modelWithTokenCounts(slug: string, outputTokens?: number): unknown {
  return {
    slug,
    short_name: slug
      .split("-")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" "),
    frontier_model: true,
    agentic_index: 80,
    coding_index: 70,
    intelligence_index_token_counts:
      outputTokens === undefined ? undefined : { output_tokens: outputTokens },
  };
}

describe("ArtificialAnalysisClient", () => {
  it("parses models from next flight payload", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout, getOrFetchValidated } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels([
      {
        slug: "model-a",
        reasoning_model: true,
        short_name: "Model A",
        agentic_index: 75,
        coding_index: 62,
        price_1m_blended_3_to_1: 0.2625,
        price_1m_input_tokens: 0.15,
        price_1m_output_tokens: 0.6,
        intelligence_index_token_counts: {
          output_tokens: 15000,
        },
      },
      {
        slug: "model-b",
        isReasoning: false,
        model_name: "Model B",
        agentic_index: 68,
      },
    ]);

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).resolves.toEqual([
      {
        slug: "model-a",
        model: "Model A",
        reasoningModel: true,
        frontierModel: false,
        agentic: 75,
        coding: 62,
        blendedPrice: 0.2625,
        inputPrice: 0.15,
        outputPrice: 0.6,
        intelligenceIndexOutputTokens: 15000,
      },
      {
        slug: "model-b",
        model: "Model B",
        reasoningModel: false,
        frontierModel: false,
        agentic: 68,
        coding: null,
        blendedPrice: null,
        inputPrice: null,
        outputPrice: null,
        intelligenceIndexOutputTokens: null,
      },
    ]);

    expect(getOrFetchValidated).toHaveBeenCalledWith(
      "ai:models",
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("parses models with variable channel and spacing", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels(
      [
        {
          slug: "model-c",
          reasoning_model: true,
          name: "Model C",
          agentic_index: 77,
          coding_index: 63,
          price_1m_blended_3_to_1: 1.5,
        },
      ],
      {
        channel: 9,
        spacedPushFormat: true,
        spacedModelsKey: true,
      },
    );

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).resolves.toEqual([
      {
        slug: "model-c",
        model: "Model C",
        reasoningModel: true,
        frontierModel: false,
        coding: 63,
        agentic: 77,
        blendedPrice: 1.5,
        inputPrice: null,
        outputPrice: null,
        intelligenceIndexOutputTokens: null,
      },
    ]);
  });

  it("parses frontier models from embedded detail-page performance data", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithEmbeddedPerformanceModels([
      {
        slug: "gpt-5-5",
        short_name: "GPT-5.5 (xhigh)",
        frontier_model: true,
        agentic_index: 74.12,
        coding_index: 59.12,
      },
      {
        slug: "gpt-5-5-medium",
        short_name: "GPT-5.5 (medium)",
        frontier_model: true,
        agentic_index: 69.39,
        coding_index: 56.21,
      },
    ]);
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toContainEqual({
      slug: "gpt-5-5-medium",
      model: "GPT-5.5 (medium)",
      reasoningModel: false,
      frontierModel: true,
      agentic: 69.39,
      coding: 56.21,
      blendedPrice: null,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
    expect(result).toContainEqual({
      slug: "gpt-5-5",
      model: "GPT-5.5 (xhigh)",
      reasoningModel: false,
      frontierModel: true,
      agentic: 74.12,
      coding: 59.12,
      blendedPrice: null,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("throws AiFetchError when page request fails", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("error", { status: 503, statusText: "Unavailable" }),
    );

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).rejects.toMatchObject({
      name: "AiFetchError",
    });
  });

  it("throws AiParseError when models cannot be found", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("<html></html>", { status: 200 }),
    );

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("parses models distributed across separate chunks", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    // Metadata models (like chunk 31) - no performance data
    const metadataModels = [
      {
        slug: "gpt-5-4-mini",
        name: "GPT-5.4 mini (xhigh)",
        shortName: "GPT-5.4 mini (xhigh)",
        isReasoning: true,
        creator: { name: "OpenAI", color: "#1f1f1f" },
      },
      {
        slug: "model-b",
        name: "Model B",
        isReasoning: false,
      },
    ];

    // Performance models (like chunk 14) - separate objects with performance data
    const performanceModels = [
      {
        slug: "gpt-5-4-mini",
        coding_index: 51.48,
        agentic_index: 55.66,
        price_1m_blended_3_to_1: 1.6875,
        price_1m_input_tokens: 0.75,
        price_1m_output_tokens: 4.5,
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    const result = await client.getModels();

    // First model should have merged data
    expect(result).toContainEqual({
      slug: "gpt-5-4-mini",
      model: "GPT-5.4 mini (xhigh)",
      reasoningModel: true,
      frontierModel: false,
      coding: 51.48,
      agentic: 55.66,
      blendedPrice: 1.6875,
      inputPrice: 0.75,
      outputPrice: 4.5,
      intelligenceIndexOutputTokens: null,
    });

    // Second model should have metadata but no performance data
    expect(result).toContainEqual({
      slug: "model-b",
      model: "Model B",
      reasoningModel: false,
      frontierModel: false,
      coding: null,
      agentic: null,
      blendedPrice: null,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("handles field name variations (isReasoning vs reasoning_model)", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels([
      {
        slug: "model-new",
        isReasoning: true, // New field name
        name: "Model with new fields", // New field name
        coding_index: 80,
        agentic_index: 75,
        price_1m_blended_3_to_1: 1.0,
      },
      {
        slug: "model-old",
        reasoning_model: false, // Old field name
        model_name: "Model with old fields", // Old field name
        coding_index: 70,
        agentic_index: 65,
        price_1m_blended_3_to_1: 2.0,
      },
    ]);

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    const result = await client.getModels();

    expect(result).toContainEqual({
      slug: "model-new",
      model: "Model with new fields",
      reasoningModel: true,
      frontierModel: false,
      coding: 80,
      agentic: 75,
      blendedPrice: 1.0,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });

    expect(result).toContainEqual({
      slug: "model-old",
      model: "Model with old fields",
      reasoningModel: false,
      frontierModel: false,
      coding: 70,
      agentic: 65,
      blendedPrice: 2.0,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("handles missing performance data gracefully", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    // Only metadata, no performance data
    const metadataModels = [
      {
        slug: "model-no-perf",
        name: "Model Without Performance Data",
        isReasoning: true,
      },
    ];

    const performanceModels: unknown[] = []; // Empty performance data

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    const result = await client.getModels();

    expect(result).toEqual([
      {
        slug: "model-no-perf",
        model: "Model Without Performance Data",
        reasoningModel: true,
        frontierModel: false,
        coding: null,
        agentic: null,
        blendedPrice: null,
        inputPrice: null,
        outputPrice: null,
        intelligenceIndexOutputTokens: null,
      },
    ]);
  });

  it("preserves first-occurrence metadata when same slug appears in multiple chunks", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    // Chunk 1: has isReasoning: true (like chunk 11 from real site)
    const chunk1 = encodeChunk(
      `b:${JSON.stringify({
        models: [
          {
            slug: "gpt-5-4-mini-duplicate",
            name: "GPT-5.4 mini Duplicate",
            shortName: "GPT-5.4 mini (xhigh)",
            isReasoning: true,
            creator: { name: "OpenAI", color: "#1f1f1f" },
          },
        ],
      })}`,
      1,
    );

    // Chunk 2: same slug but WITHOUT isReasoning field (like chunk 28 from real site)
    const chunk2 = encodeChunk(
      `b:${JSON.stringify({
        models: [
          {
            slug: "gpt-5-4-mini-duplicate",
            name: "GPT-5.4 mini Duplicate",
            shortName: "GPT-5.4 mini (xhigh)",
            // isReasoning intentionally missing
            coding_index: 51.48,
            agentic_index: 55.66,
            price_1m_blended_3_to_1: 1.6875,
            price_1m_input_tokens: 0.75,
            price_1m_output_tokens: 4.5,
          },
        ],
      })}`,
      2,
    );

    const html = `<html><body>${chunk1}${chunk2}</body></html>`;
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    const result = await client.getModels();

    // First occurrence should win - isReasoning should be preserved from chunk 1
    expect(result).toContainEqual({
      slug: "gpt-5-4-mini-duplicate",
      model: "GPT-5.4 mini Duplicate",
      reasoningModel: true,
      frontierModel: false,
      coding: 51.48,
      agentic: 55.66,
      blendedPrice: 1.6875,
      inputPrice: 0.75,
      outputPrice: 4.5,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("parses frontier_model from models array", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels([
      {
        slug: "frontier-model",
        reasoning_model: true,
        frontier_model: true,
        short_name: "Frontier Model",
        agentic_index: 80,
        coding_index: 70,
        price_1m_blended_3_to_1: 1.0,
      },
      {
        slug: "non-frontier-model",
        reasoning_model: true,
        frontier_model: false,
        short_name: "Non-Frontier Model",
        agentic_index: 75,
        coding_index: 65,
        price_1m_blended_3_to_1: 0.5,
      },
    ]);

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toContainEqual({
      slug: "frontier-model",
      model: "Frontier Model",
      reasoningModel: true,
      frontierModel: true,
      agentic: 80,
      coding: 70,
      blendedPrice: 1.0,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });

    expect(result).toContainEqual({
      slug: "non-frontier-model",
      model: "Non-Frontier Model",
      reasoningModel: true,
      frontierModel: false,
      agentic: 75,
      coding: 65,
      blendedPrice: 0.5,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("defaults missing frontier_model to false", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels([
      {
        slug: "no-frontier-flag",
        reasoning_model: true,
        short_name: "No Frontier Flag",
        agentic_index: 80,
        coding_index: 70,
        price_1m_blended_3_to_1: 1.0,
      },
    ]);

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result[0].frontierModel).toBe(false);
  });

  it("merges frontier_model from performance data into metadata by slug", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    const metadataModels = [
      {
        slug: "gpt-5-4-mini",
        name: "GPT-5.4 mini (xhigh)",
        isReasoning: true,
      },
    ];

    const performanceModels = [
      {
        slug: "gpt-5-4-mini",
        frontier_model: true,
        coding_index: 51.48,
        agentic_index: 55.66,
        price_1m_blended_3_to_1: 1.6875,
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toContainEqual({
      slug: "gpt-5-4-mini",
      model: "GPT-5.4 mini (xhigh)",
      reasoningModel: true,
      frontierModel: true,
      coding: 51.48,
      agentic: 55.66,
      blendedPrice: 1.6875,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("handles duplicate slugs with identical metadata in multiple chunks", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    // Chunk 1 and Chunk 2 have same slug with identical metadata
    const chunk1 = encodeChunk(
      `b:${JSON.stringify({
        models: [
          {
            slug: "model-identical",
            name: "Model Identical",
            isReasoning: true,
            coding_index: 60,
            agentic_index: 65,
          },
        ],
      })}`,
      1,
    );

    const chunk2 = encodeChunk(
      `b:${JSON.stringify({
        models: [
          {
            slug: "model-identical",
            name: "Model Identical",
            isReasoning: true,
            coding_index: 60,
            agentic_index: 65,
          },
        ],
      })}`,
      2,
    );

    const html = `<html><body>${chunk1}${chunk2}</body></html>`;
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    const result = await client.getModels();

    // Should have exactly one entry (no duplicates)
    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      slug: "model-identical",
      model: "Model Identical",
      reasoningModel: true,
      frontierModel: false,
      coding: 60,
      agentic: 65,
      blendedPrice: null,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("refetches once when cached models have no rankable frontier model", async () => {
    const staleModels: ArtificialAnalysisModel[] = [
      {
        slug: "stale-model",
        model: "Stale Model",
        reasoningModel: true,
        frontierModel: false,
        agentic: 75,
        coding: 62,
        blendedPrice: 0.5,
        inputPrice: 0.3,
        outputPrice: 0.7,
        intelligenceIndexOutputTokens: null,
      },
    ];

    let fetchCount = 0;
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient(async (_key, fetcher, validator) => {
        if (fetchCount === 0) {
          fetchCount++;
          if (validator(staleModels)) return staleModels;
          return fetcher();
        }
        return fetcher();
      });

    const freshHtml = buildHtmlWithModels([
      {
        slug: "fresh-frontier",
        reasoning_model: true,
        frontier_model: true,
        short_name: "Fresh Frontier",
        agentic_index: 80,
        coding_index: 70,
        price_1m_blended_3_to_1: 1.0,
      },
    ]);
    fetchWithTimeout.mockResolvedValue(
      new Response(freshHtml, { status: 200 }),
    );

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toContainEqual(
      expect.objectContaining({ slug: "fresh-frontier", frontierModel: true }),
    );
  });

  it("fails when refreshed models still have no rankable frontier model", async () => {
    const staleModels: ArtificialAnalysisModel[] = [
      {
        slug: "stale-model",
        model: "Stale Model",
        reasoningModel: true,
        frontierModel: false,
        agentic: 75,
        coding: 62,
        blendedPrice: 0.5,
        inputPrice: 0.3,
        outputPrice: 0.7,
        intelligenceIndexOutputTokens: null,
      },
    ];

    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient(async (_key, fetcher, validator) => {
        if (!validator(staleModels)) {
          const freshHtml = buildHtmlWithModels([
            {
              slug: "fresh-no-frontier",
              reasoning_model: true,
              frontier_model: false,
              short_name: "Fresh No Frontier",
              agentic_index: 80,
              coding_index: 70,
              price_1m_blended_3_to_1: 1.0,
            },
          ]);
          fetchWithTimeout.mockResolvedValue(
            new Response(freshHtml, { status: 200 }),
          );
          const freshResult = await fetcher();
          if (!validator(freshResult)) {
            throw new Error("Fresh value failed validation for key: ai:models");
          }
          return freshResult;
        }
        return staleModels;
      });

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).rejects.toThrow(
      "Fresh value failed validation for key: ai:models",
    );
  });

  it("accepts cached non-reasoning frontier model with coding and agentic", async () => {
    const cachedModels: ArtificialAnalysisModel[] = [
      {
        slug: "non-reasoning-frontier",
        model: "Non-Reasoning Frontier",
        reasoningModel: false,
        frontierModel: true,
        agentic: 80,
        coding: 70,
        blendedPrice: null,
        inputPrice: null,
        outputPrice: null,
        intelligenceIndexOutputTokens: null,
      },
    ];

    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient(async (_key, fetcher, validator) => {
        if (validator(cachedModels)) return cachedModels;
        return fetcher();
      });

    const html = buildHtmlWithModels([
      {
        slug: "should-not-be-fetched",
        reasoning_model: false,
        frontier_model: true,
        short_name: "Should Not Be Fetched",
        agentic_index: 80,
        coding_index: 70,
      },
    ]);
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toEqual(cachedModels);
  });

  it("rejects cached frontier model without coding score", async () => {
    const staleModels: ArtificialAnalysisModel[] = [
      {
        slug: "no-coding",
        model: "No Coding",
        reasoningModel: true,
        frontierModel: true,
        agentic: 80,
        coding: null,
        blendedPrice: null,
        inputPrice: null,
        outputPrice: null,
        intelligenceIndexOutputTokens: null,
      },
    ];

    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient(async (_key, fetcher, validator) => {
        if (validator(staleModels)) return staleModels;
        const freshHtml = buildHtmlWithModels([
          {
            slug: "fresh-frontier",
            reasoning_model: true,
            frontier_model: true,
            short_name: "Fresh Frontier",
            agentic_index: 80,
            coding_index: 70,
            price_1m_blended_3_to_1: 1.0,
          },
        ]);
        fetchWithTimeout.mockResolvedValue(
          new Response(freshHtml, { status: 200 }),
        );
        return fetcher();
      });

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toContainEqual(
      expect.objectContaining({ slug: "fresh-frontier", frontierModel: true }),
    );
  });

  it("fills scores from embedded performance data into metadata models by slug", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    const metadataModels = [
      {
        slug: "gpt-5-5-medium",
        name: "GPT-5.5 (medium)",
        isReasoning: false,
      },
      {
        slug: "gpt-5-5",
        name: "GPT-5.5 (xhigh)",
        isReasoning: true,
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, []);
    const embeddedPayload = JSON.stringify({
      models: [
        {
          slug: "gpt-5-5-medium",
          short_name: "GPT-5.5 (medium)",
          frontier_model: true,
          coding_index: 56.21,
          agentic_index: 69.39,
        },
        {
          slug: "gpt-5-5",
          short_name: "GPT-5.5 (xhigh)",
          frontier_model: true,
          coding_index: 59.12,
          agentic_index: 74.12,
        },
      ],
    }).replace(/"/g, '\\"');
    const htmlWithEmbedded = html.replace(
      "</body>",
      `<script>${embeddedPayload}</script></body>`,
    );
    fetchWithTimeout.mockResolvedValue(
      new Response(htmlWithEmbedded, { status: 200 }),
    );

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toContainEqual({
      slug: "gpt-5-5-medium",
      model: "GPT-5.5 (medium)",
      reasoningModel: false,
      frontierModel: true,
      agentic: 69.39,
      coding: 56.21,
      blendedPrice: null,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
    expect(result).toContainEqual({
      slug: "gpt-5-5",
      model: "GPT-5.5 (xhigh)",
      reasoningModel: true,
      frontierModel: true,
      agentic: 74.12,
      coding: 59.12,
      blendedPrice: null,
      inputPrice: null,
      outputPrice: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("treats missing frontier_model as not frontier after merge", async () => {
    const performanceData = [
      {
        slug: "no-frontier-flag",
        coding_index: 60,
        agentic_index: 65,
      },
    ];

    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithSeparateChunks(
      [
        {
          slug: "no-frontier-flag",
          short_name: "No Frontier Flag",
          reasoning_model: true,
        },
      ],
      performanceData,
    );
    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "no-frontier-flag",
        frontierModel: false,
      }),
    );
  });

  it("parses intelligence_index_token_counts.output_tokens from model objects", async () => {
    const html = buildHtmlWithModels([
      modelWithTokenCounts("model-with-tokens", 25000),
    ]);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "model-with-tokens",
        intelligenceIndexOutputTokens: 25000,
      }),
    );
  });

  it("returns null for missing intelligence_index_token_counts", async () => {
    const html = buildHtmlWithModels([modelWithTokenCounts("model-no-tokens")]);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "model-no-tokens",
        intelligenceIndexOutputTokens: null,
      }),
    );
  });

  it.each([
    ["model-invalid-tokens", Infinity],
    ["model-zero-tokens", 0],
    ["model-negative-tokens", -100],
  ])("returns null for invalid output_tokens: %s", async (slug, tokens) => {
    const html = buildHtmlWithModels([modelWithTokenCounts(slug, tokens)]);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug,
        intelligenceIndexOutputTokens: null,
      }),
    );
  });

  it("merges output token counts by slug from performance data", async () => {
    const metadataModels = [
      {
        slug: "model-merge",
        name: "Model Merge",
        isReasoning: true,
      },
    ];

    const performanceModels = [
      {
        slug: "model-merge",
        frontier_model: true,
        coding_index: 51.48,
        agentic_index: 55.66,
        intelligence_index_token_counts: {
          output_tokens: 18000,
        },
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "model-merge",
        intelligenceIndexOutputTokens: 18000,
      }),
    );
  });

  it("merges output token counts from embedded performance data", async () => {
    const html = buildHtmlWithEmbeddedPerformanceModels([
      {
        slug: "embedded-tokens",
        short_name: "Embedded Tokens",
        frontier_model: true,
        agentic_index: 74.12,
        coding_index: 59.12,
        intelligence_index_token_counts: {
          output_tokens: 30000,
        },
      },
    ]);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "embedded-tokens",
        intelligenceIndexOutputTokens: 30000,
      }),
    );
  });
});
