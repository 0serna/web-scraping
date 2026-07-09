import { describe, expect, it, vi } from "vitest";
import { mockServiceModuleDependencies } from "../../../shared/test-utils/service-test-helpers.js";
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

  const mocks = mockServiceModuleDependencies<ArtificialAnalysisModel[]>(
    getOrFetchValidatedImpl,
  );

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

function mockHtmlResponse(
  fetchWithTimeout: ReturnType<typeof vi.fn>,
  html: string,
) {
  fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));
}

async function getModelsFromClient(
  ArtificialAnalysisClient: new (logger: never) => {
    getModels: () => Promise<ArtificialAnalysisModel[]>;
  },
) {
  const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
  return client.getModels();
}

function expectFreshModel(result: ArtificialAnalysisModel[]) {
  expect(result).toContainEqual(
    expect.objectContaining({ slug: "fresh-model", coding: 70 }),
  );
}

async function expectCachedModelsRejected(
  staleModels: ArtificialAnalysisModel[],
) {
  const { ArtificialAnalysisClient, fetchWithTimeout } =
    await loadArtificialAnalysisClient(async (_key, fetcher, validator) => {
      if (validator(staleModels)) return staleModels;
      const freshHtml = buildHtmlWithModels([freshRawModel()]);
      mockHtmlResponse(fetchWithTimeout, freshHtml);
      return fetcher();
    });

  expectFreshModel(await getModelsFromClient(ArtificialAnalysisClient));
}

function modelWithCanonicalTokenCounts(slug: string, output?: number): unknown {
  return {
    slug,
    shortName: slug
      .split("-")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" "),
    codingIndex: 70,
    canonicalIntelligenceIndexTokenCount:
      output === undefined
        ? undefined
        : { output, input: 1000, answer: 500, reasoning: 200 },
  };
}

function freshRawModel(slug = "fresh-model"): unknown {
  return {
    slug,
    shortName: "Fresh Model",
    codingIndex: 70,
    canonicalIntelligenceIndexTokenCount: {
      output: 25_000,
      input: 1000,
      answer: 500,
      reasoning: 200,
    },
  };
}

function staleModel(overrides: Partial<ArtificialAnalysisModel> = {}) {
  return {
    slug: "stale-model",
    model: "Stale Model",
    coding: 62,
    intelligenceIndexOutputTokens: null,
    ...overrides,
  } satisfies ArtificialAnalysisModel;
}

function expectGpt55PerformanceModels(result: ArtificialAnalysisModel[]) {
  expect(result).toContainEqual({
    slug: "gpt-5-5-medium",
    model: "GPT-5.5 (medium)",
    coding: 56.21,
    intelligenceIndexOutputTokens: null,
  });
  expect(result).toContainEqual({
    slug: "gpt-5-5",
    model: "GPT-5.5 (xhigh)",
    coding: 59.12,
    intelligenceIndexOutputTokens: null,
  });
}

describe("ArtificialAnalysisClient", () => {
  it("parses models from next flight payload", async () => {
    const { ArtificialAnalysisClient, fetchWithTimeout, getOrFetchValidated } =
      await loadArtificialAnalysisClient();

    const html = buildHtmlWithModels([
      {
        slug: "model-a",
        shortName: "Model A",
        codingIndex: 62,
        canonicalIntelligenceIndexTokenCount: {
          output: 15000,
          input: 1000,
          answer: 500,
          reasoning: 200,
        },
      },
      {
        slug: "model-b",
        name: "Model B",
      },
    ]);

    fetchWithTimeout.mockResolvedValue(new Response(html, { status: 200 }));

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);

    await expect(client.getModels()).resolves.toEqual([
      {
        slug: "model-a",
        model: "Model A",
        coding: 62,
        intelligenceIndexOutputTokens: 15000,
      },
      {
        slug: "model-b",
        model: "Model B",
        coding: null,
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
    const html = buildHtmlWithModels(
      [
        {
          slug: "model-c",
          name: "Model C",
          codingIndex: 63,
        },
      ],
      {
        channel: 9,
        spacedPushFormat: true,
        spacedModelsKey: true,
      },
    );

    await expect(parseModelsFromHtml(html)).resolves.toEqual([
      {
        slug: "model-c",
        model: "Model C",
        coding: 63,
        intelligenceIndexOutputTokens: null,
      },
    ]);
  });

  it("parses current payload performance data", async () => {
    const html = buildHtmlWithEmbeddedPerformanceModels([
      {
        slug: "gpt-5-5",
        shortName: "GPT-5.5 (xhigh)",
        codingIndex: 59.12,
      },
      {
        slug: "gpt-5-5-medium",
        shortName: "GPT-5.5 (medium)",
        codingIndex: 56.21,
      },
    ]);
    const result = await parseModelsFromHtml(html);

    expectGpt55PerformanceModels(result);
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
    // Metadata models (like chunk 31) - no performance data
    const metadataModels = [
      {
        slug: "gpt-5-4-mini",
        name: "GPT-5.4 mini (xhigh)",
        shortName: "GPT-5.4 mini (xhigh)",
        creator: { name: "OpenAI", color: "#1f1f1f" },
      },
      {
        slug: "model-b",
        name: "Model B",
      },
    ];

    // Performance models (like chunk 14) - separate objects with performance data
    const performanceModels = [
      {
        slug: "gpt-5-4-mini",
        codingIndex: 51.48,
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    const result = await parseModelsFromHtml(html);

    // First model should have merged data
    expect(result).toContainEqual({
      slug: "gpt-5-4-mini",
      model: "GPT-5.4 mini (xhigh)",
      coding: 51.48,
      intelligenceIndexOutputTokens: null,
    });

    // Second model should have metadata but no performance data
    expect(result).toContainEqual({
      slug: "model-b",
      model: "Model B",
      coding: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("handles model name field variations", async () => {
    const html = buildHtmlWithModels([
      {
        slug: "model-new",
        shortName: "Model with shortName field",
        codingIndex: 80,
      },
      {
        slug: "model-old",
        name: "Model with name field",
        codingIndex: 70,
      },
    ]);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual({
      slug: "model-new",
      model: "Model with shortName field",
      coding: 80,
      intelligenceIndexOutputTokens: null,
    });

    expect(result).toContainEqual({
      slug: "model-old",
      model: "Model with name field",
      coding: 70,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("handles missing performance data gracefully", async () => {
    // Only metadata, no performance data
    const metadataModels = [
      {
        slug: "model-no-perf",
        name: "Model Without Performance Data",
      },
    ];

    const performanceModels: unknown[] = []; // Empty performance data

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    const result = await parseModelsFromHtml(html);

    expect(result).toEqual([
      {
        slug: "model-no-perf",
        model: "Model Without Performance Data",
        coding: null,
        intelligenceIndexOutputTokens: null,
      },
    ]);
  });

  it("preserves first-occurrence metadata when same slug appears in multiple chunks", async () => {
    const chunk1 = encodeChunk(
      `b:${JSON.stringify({
        models: [
          {
            slug: "gpt-5-4-mini-duplicate",
            name: "GPT-5.4 mini Duplicate",
            shortName: "GPT-5.4 mini (xhigh)",
            creator: { name: "OpenAI", color: "#1f1f1f" },
          },
        ],
      })}`,
      1,
    );

    const chunk2 = encodeChunk(
      `b:${JSON.stringify({
        models: [
          {
            slug: "gpt-5-4-mini-duplicate",
            name: "GPT-5.4 mini Duplicate",
            shortName: "GPT-5.4 mini (xhigh)",
            codingIndex: 51.48,
          },
        ],
      })}`,
      2,
    );

    const html = `<html><body>${chunk1}${chunk2}</body></html>`;
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual({
      slug: "gpt-5-4-mini-duplicate",
      model: "GPT-5.4 mini (xhigh)",
      coding: 51.48,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("parses current camelCase fields from models array", async () => {
    const html = buildHtmlWithModels([
      {
        slug: "current-model",
        shortName: "Current Model",
        codingIndex: 70,
      },
      {
        slug: "model-with-only-name",
        name: "Model With Only Name",
      },
    ]);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual({
      slug: "current-model",
      model: "Current Model",
      coding: 70,
      intelligenceIndexOutputTokens: null,
    });

    expect(result).toContainEqual({
      slug: "model-with-only-name",
      model: "Model With Only Name",
      coding: null,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("preserves explicit deprecated values and omits missing deprecated", async () => {
    const html = buildHtmlWithModels([
      {
        slug: "deprecated-model",
        shortName: "Deprecated Model",
        codingIndex: 70,
        deprecated: true,
      },
      {
        slug: "active-model",
        shortName: "Active Model",
        codingIndex: 65,
        deprecated: false,
      },
      {
        slug: "unknown-lifecycle-model",
        shortName: "Unknown Lifecycle Model",
        codingIndex: 60,
      },
    ]);

    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({ slug: "deprecated-model", deprecated: true }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({ slug: "active-model", deprecated: false }),
    );
    const unknownLifecycleModel = result.find(
      (model) => model.slug === "unknown-lifecycle-model",
    );

    expect(unknownLifecycleModel).toBeDefined();
    expect(unknownLifecycleModel).not.toHaveProperty("deprecated");
  });

  it("merges current performance fields into metadata by slug", async () => {
    const metadataModels = [
      {
        slug: "gpt-5-4-mini",
        name: "GPT-5.4 mini (xhigh)",
      },
    ];

    const performanceModels = [
      {
        slug: "gpt-5-4-mini",
        codingIndex: 51.48,
        canonicalIntelligenceIndexTokenCount: {
          output: 12345678,
          input: 1000,
          answer: 500,
          reasoning: 200,
        },
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual({
      slug: "gpt-5-4-mini",
      model: "GPT-5.4 mini (xhigh)",
      coding: 51.48,
      intelligenceIndexOutputTokens: 12345678,
    });
  });

  it("merges deprecated from performance data by slug", async () => {
    const metadataModels = [
      {
        slug: "deprecated-from-performance",
        name: "Deprecated From Performance",
      },
    ];

    const performanceModels = [
      {
        slug: "deprecated-from-performance",
        codingIndex: 51.48,
        deprecated: true,
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "deprecated-from-performance",
        deprecated: true,
      }),
    );
  });

  it("handles duplicate slugs with identical metadata in multiple chunks", async () => {
    // Chunk 1 and Chunk 2 have same slug with identical metadata
    const chunk1 = encodeChunk(
      `b:${JSON.stringify({
        models: [
          {
            slug: "model-identical",
            name: "Model Identical",
            codingIndex: 60,
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
            codingIndex: 60,
          },
        ],
      })}`,
      2,
    );

    const html = `<html><body>${chunk1}${chunk2}</body></html>`;
    const result = await parseModelsFromHtml(html);

    // Should have exactly one entry (no duplicates)
    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      slug: "model-identical",
      model: "Model Identical",
      coding: 60,
      intelligenceIndexOutputTokens: null,
    });
  });

  it("refetches once when cached models have no rankable model", async () => {
    const staleModels: ArtificialAnalysisModel[] = [
      staleModel({ coding: null }),
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

    const freshHtml = buildHtmlWithModels([freshRawModel()]);
    mockHtmlResponse(fetchWithTimeout, freshHtml);

    expectFreshModel(await getModelsFromClient(ArtificialAnalysisClient));
  });

  it("fails when refreshed models still have no rankable model", async () => {
    const staleModels: ArtificialAnalysisModel[] = [
      staleModel({ coding: null }),
    ];

    const { ArtificialAnalysisClient, fetchWithTimeout } =
      await loadArtificialAnalysisClient(async (_key, fetcher, validator) => {
        if (!validator(staleModels)) {
          const freshHtml = buildHtmlWithModels([
            {
              slug: "fresh-no-coding",
              shortName: "Fresh No Coding",
            },
          ]);
          mockHtmlResponse(fetchWithTimeout, freshHtml);
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

  it("accepts cached model with coding and output tokens", async () => {
    const cachedModels: ArtificialAnalysisModel[] = [
      {
        slug: "cached-model",
        model: "Cached Model",
        coding: 70,
        intelligenceIndexOutputTokens: 25_000,
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
        shortName: "Should Not Be Fetched",
        codingIndex: 70,
        canonicalIntelligenceIndexTokenCount: {
          output: 25_000,
          input: 1000,
          answer: 500,
          reasoning: 200,
        },
      },
    ]);
    mockHtmlResponse(fetchWithTimeout, html);

    const client = new ArtificialAnalysisClient({ child: vi.fn() } as never);
    const result = await client.getModels();

    expect(result).toEqual(cachedModels);
  });

  it("rejects cached model when it is deprecated", async () => {
    const staleModels: ArtificialAnalysisModel[] = [
      staleModel({
        slug: "deprecated-cached-model",
        model: "Deprecated Cached Model",
        coding: 70,
        deprecated: true,
      }),
    ];

    await expectCachedModelsRejected(staleModels);
  });

  it("rejects cached model without coding score", async () => {
    const staleModels: ArtificialAnalysisModel[] = [
      {
        slug: "no-coding",
        model: "No Coding",
        coding: null,
        intelligenceIndexOutputTokens: 25_000,
      },
    ];

    await expectCachedModelsRejected(staleModels);
  });

  it("accepts cached model without output tokens", async () => {
    const staleModels: ArtificialAnalysisModel[] = [
      {
        slug: "no-output-tokens",
        model: "No Output Tokens",
        coding: 70,
        intelligenceIndexOutputTokens: null,
      },
    ];

    const { ArtificialAnalysisClient } = await loadArtificialAnalysisClient(
      async (_key, fetcher, validator) => {
        if (validator(staleModels)) return staleModels;
        throw new Error("should not refetch");
      },
    );

    await expect(
      getModelsFromClient(ArtificialAnalysisClient),
    ).resolves.toContainEqual(
      expect.objectContaining({ slug: "no-output-tokens", coding: 70 }),
    );
  });

  it("fills scores from embedded performance data into metadata models by slug", async () => {
    const metadataModels = [
      {
        slug: "gpt-5-5-medium",
        name: "GPT-5.5 (medium)",
      },
      {
        slug: "gpt-5-5",
        name: "GPT-5.5 (xhigh)",
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, []);
    const embeddedPayload = JSON.stringify({
      models: [
        {
          slug: "gpt-5-5-medium",
          shortName: "GPT-5.5 (medium)",
          codingIndex: 56.21,
        },
        {
          slug: "gpt-5-5",
          shortName: "GPT-5.5 (xhigh)",
          codingIndex: 59.12,
        },
      ],
    }).replace(/"/g, '\\"');
    const htmlWithEmbedded = html.replace(
      "</body>",
      `<script>${embeddedPayload}</script></body>`,
    );
    const result = await parseModelsFromHtml(htmlWithEmbedded);

    expectGpt55PerformanceModels(result);
  });

  it("treats missing codingIndex as unparsed performance data after merge", async () => {
    const performanceData = [
      {
        slug: "no-coding-index",
      },
    ];

    const html = buildHtmlWithSeparateChunks(
      [
        {
          slug: "no-coding-index",
          name: "No Coding Index",
        },
      ],
      performanceData,
    );
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "no-coding-index",
        coding: null,
        intelligenceIndexOutputTokens: null,
      }),
    );
  });

  it("parses canonicalIntelligenceIndexTokenCount.output from model objects", async () => {
    const html = buildHtmlWithModels([
      modelWithCanonicalTokenCounts("model-canonical-tokens", 50000),
    ]);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "model-canonical-tokens",
        intelligenceIndexOutputTokens: 50000,
      }),
    );
  });

  it("merges canonical token counts by slug from performance data", async () => {
    const metadataModels = [
      {
        slug: "model-merge-canonical",
        name: "Model Merge Canonical",
      },
    ];

    const performanceModels = [
      {
        slug: "model-merge-canonical",
        codingIndex: 51.48,
        canonicalIntelligenceIndexTokenCount: {
          output: 72301736,
          input: 364032098,
          answer: 4392561,
          reasoning: 67909175,
        },
      },
    ];

    const html = buildHtmlWithSeparateChunks(metadataModels, performanceModels);
    const result = await parseModelsFromHtml(html);

    expect(result).toContainEqual(
      expect.objectContaining({
        slug: "model-merge-canonical",
        intelligenceIndexOutputTokens: 72301736,
      }),
    );
  });

  it("throws AiParseError when current payload contains no codingIndex signal", async () => {
    const html = buildHtmlWithModels([
      {
        slug: "legacy-model",
        short_name: "Legacy Model",
        coding_index: 70,
      },
    ]);

    await expect(parseModelsFromHtml(html)).rejects.toMatchObject({
      name: "AiParseError",
    });
  });
});
