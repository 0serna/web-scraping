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
      },
    ]);
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
});
