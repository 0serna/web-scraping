import { describe, expect, it, vi } from "vitest";
import { createMockLogger } from "../test-utils/service-test-helpers.js";

interface LoadOptions {
  url?: string;
  token?: string;
  nodeEnv?: string;
  getImpl?: () => Promise<unknown>;
  setexImpl?: () => Promise<unknown>;
  delImpl?: () => Promise<unknown>;
}

async function loadUpstashCacheModule(options: LoadOptions = {}) {
  vi.resetModules();

  const getMock = vi.fn(options.getImpl ?? (async () => null));
  const setexMock = vi.fn(options.setexImpl ?? (async () => "OK"));
  const delMock = vi.fn(options.delImpl ?? (async () => 1));

  const redisConstructorSpy = vi.fn();

  class RedisMock {
    get = getMock;
    setex = setexMock;
    del = delMock;

    constructor(params: unknown) {
      redisConstructorSpy(params);
    }
  }

  vi.doMock("@upstash/redis", () => ({
    Redis: RedisMock,
  }));

  vi.doMock("../config/index.js", () => ({
    config: {
      env: {
        nodeEnv: options.nodeEnv ?? "development",
      },
      cache: {
        upstash: {
          url: options.url,
          token: options.token,
        },
      },
    },
  }));

  const { UpstashCache } = await import("./upstash-cache.js");

  return {
    UpstashCache,
    getMock,
    setexMock,
    delMock,
    redisConstructorSpy,
  };
}

async function createNumberCache(options: LoadOptions = {}, ttlMs = 1000) {
  const loaded = await loadUpstashCacheModule({
    url: "https://upstash.test",
    token: "token",
    ...options,
  });
  const logger = createMockLogger();
  const cache = new loaded.UpstashCache<number>(ttlMs, logger as never);

  return { ...loaded, logger, cache };
}

function createDeferredNumberFetcher() {
  let resolveFetcher: (value: number) => void = () => undefined;
  const fetcher = vi.fn(
    () =>
      new Promise<number>((resolve) => {
        resolveFetcher = resolve;
      }),
  );

  return { fetcher, resolveFetcher: (value: number) => resolveFetcher(value) };
}

async function expectCoalescedNumberFetch(
  setexMock: ReturnType<typeof vi.fn>,
  fetcher: ReturnType<typeof vi.fn>,
  resolveFetcher: (value: number) => void,
  requests: Array<Promise<number>>,
) {
  await vi.waitFor(() => {
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  resolveFetcher(77);

  await expect(Promise.all(requests)).resolves.toEqual([77, 77]);
  expect(setexMock).toHaveBeenCalledTimes(1);
}

async function createMissValidationCase(validatorResult: boolean) {
  const context = await createNumberCache({ getImpl: async () => null });
  return {
    ...context,
    fetcher: vi.fn().mockResolvedValue(55),
    validator: vi.fn().mockReturnValue(validatorResult),
  };
}

describe("UpstashCache", () => {
  it("throws when credentials are missing", async () => {
    const { UpstashCache } = await loadUpstashCacheModule();
    const logger = createMockLogger();

    expect(() => new UpstashCache<number>(1000, logger as never)).toThrow(
      "UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set",
    );
  });

  it("gets cached values with prefixed keys", async () => {
    const { getMock, cache } = await createNumberCache({
      getImpl: async () => 9,
    });

    await expect(cache.get("game:1")).resolves.toBe(9);
    expect(getMock).toHaveBeenCalledWith("ws:game:1");
  });

  it("returns null and logs when get fails", async () => {
    const { logger, cache } = await createNumberCache({
      getImpl: async () => {
        throw new Error("redis-get-error");
      },
    });

    await expect(cache.get("game:1")).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ key: "game:1", err: expect.any(Error) }),
      "Error getting value from cache",
    );
  });

  it("stores values using ttl in seconds rounded up", async () => {
    const { setexMock, cache } = await createNumberCache({}, 1500);

    await cache.set("game:1", 88);

    expect(setexMock).toHaveBeenCalledWith("ws:game:1", 2, 88);
  });

  it("logs and does not throw when set fails", async () => {
    const { logger, cache } = await createNumberCache({
      setexImpl: async () => {
        throw new Error("redis-set-error");
      },
    });

    await expect(cache.set("game:1", 88)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ key: "game:1", err: expect.any(Error) }),
      "Error setting value in cache",
    );
  });

  it("returns cached value on cache hit without calling fetcher", async () => {
    const { cache } = await createNumberCache({
      getImpl: async () => 72,
    });
    const fetcher = vi.fn().mockResolvedValue(99);

    await expect(cache.getOrFetch("game:1", fetcher)).resolves.toBe(72);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches and stores value on cache miss", async () => {
    const { setexMock, cache } = await createNumberCache({
      getImpl: async () => null,
    });
    const fetcher = vi.fn().mockResolvedValue(55);

    await expect(cache.getOrFetch("game:1", fetcher)).resolves.toBe(55);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(setexMock).toHaveBeenCalledWith("ws:game:1", 1, 55);
  });

  it("coalesces concurrent misses for the same key", async () => {
    const { setexMock, cache } = await createNumberCache({
      getImpl: async () => null,
    });

    const { fetcher, resolveFetcher } = createDeferredNumberFetcher();

    const first = cache.getOrFetch("game:1", fetcher);
    const second = cache.getOrFetch("game:1", fetcher);

    await expectCoalescedNumberFetch(setexMock, fetcher, resolveFetcher, [
      first,
      second,
    ]);
  });

  it("clears pending requests after fetcher failure", async () => {
    const { cache } = await createNumberCache({
      getImpl: async () => null,
    });

    const fetcher = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error("fetch-error"))
      .mockResolvedValueOnce(81);

    await expect(cache.getOrFetch("game:1", fetcher)).rejects.toThrow(
      "fetch-error",
    );
    await expect(cache.getOrFetch("game:1", fetcher)).resolves.toBe(81);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("deletes a single key with prefix", async () => {
    const { delMock, cache } = await createNumberCache();

    await cache.delete("game:1");

    expect(delMock).toHaveBeenCalledWith("ws:game:1");
  });

  it("logs and does not throw when delete fails", async () => {
    const { logger, cache } = await createNumberCache({
      delImpl: async () => {
        throw new Error("redis-del-error");
      },
    });

    await expect(cache.delete("game:1")).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ key: "game:1", err: expect.any(Error) }),
      "Error deleting value from cache",
    );
  });

  it("returns validated cached value when validator accepts", async () => {
    const { getMock, cache } = await createNumberCache({
      getImpl: async () => 42,
    });
    const fetcher = vi.fn().mockResolvedValue(99);
    const validator = vi.fn().mockReturnValue(true);

    await expect(
      cache.getOrFetchValidated("game:1", fetcher, validator),
    ).resolves.toBe(42);
    expect(fetcher).not.toHaveBeenCalled();
    expect(validator).toHaveBeenCalledWith(42);
    expect(getMock).toHaveBeenCalledWith("ws:game:1");
  });

  it("invalidates stale cache and refetches when validator rejects", async () => {
    const { setexMock, delMock, logger, cache } = await createNumberCache({
      getImpl: async () => 42,
    });
    const fetcher = vi.fn().mockResolvedValue(99);
    const validator = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await expect(
      cache.getOrFetchValidated("game:1", fetcher, validator),
    ).resolves.toBe(99);
    expect(delMock).toHaveBeenCalledWith("ws:game:1");
    expect(setexMock).toHaveBeenCalledWith("ws:game:1", 1, 99);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ key: "game:1" }),
      "Stale cache invalidation - validation failed",
    );
  });

  it("fetches and validates on cache miss", async () => {
    const { setexMock, cache, fetcher, validator } =
      await createMissValidationCase(true);

    await expect(
      cache.getOrFetchValidated("game:1", fetcher, validator),
    ).resolves.toBe(55);
    expect(validator).toHaveBeenCalledWith(55);
    expect(setexMock).toHaveBeenCalledWith("ws:game:1", 1, 55);
  });

  it("throws when fresh value fails validation", async () => {
    const { setexMock, cache, fetcher, validator } =
      await createMissValidationCase(false);

    await expect(
      cache.getOrFetchValidated("game:1", fetcher, validator),
    ).rejects.toThrow("Fresh value failed validation for key: game:1");
    expect(setexMock).not.toHaveBeenCalled();
  });

  it("does not store invalid fresh value when stale cache was invalidated", async () => {
    const { setexMock, delMock, cache } = await createNumberCache({
      getImpl: async () => 42,
    });
    const fetcher = vi.fn().mockResolvedValue(99);
    const validator = vi.fn().mockReturnValue(false);

    await expect(
      cache.getOrFetchValidated("game:1", fetcher, validator),
    ).rejects.toThrow("Fresh value failed validation for key: game:1");
    expect(delMock).toHaveBeenCalledWith("ws:game:1");
    expect(setexMock).not.toHaveBeenCalled();
  });

  it("invalidates cache and refetches when validator throws on cached value", async () => {
    const { UpstashCache, setexMock, delMock } = await loadUpstashCacheModule({
      url: "https://upstash.test",
      token: "token",
      getImpl: async () => ({ name: null, score: 90 }),
    });

    const logger = createMockLogger();
    const cache = new UpstashCache<{ name: string | null; score: number }>(
      1000,
      logger as never,
    );
    const fetcher = vi.fn().mockResolvedValue({ name: "Game", score: 95 });
    const validator = vi.fn((data: { name: string | null; score: number }) => {
      if (data.name!.trim().length > 0) return true;
      return false;
    });

    await expect(
      cache.getOrFetchValidated("game:1", fetcher, validator),
    ).resolves.toEqual({ name: "Game", score: 95 });
    expect(delMock).toHaveBeenCalledWith("ws:game:1");
    expect(setexMock).toHaveBeenCalledWith("ws:game:1", 1, {
      name: "Game",
      score: 95,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ key: "game:1" }),
      "Cached value validation threw - treating as stale",
    );
  });

  it("coalesces concurrent validated fetches for the same key", async () => {
    const { setexMock, cache } = await createNumberCache({
      getImpl: async () => null,
    });

    const { fetcher, resolveFetcher } = createDeferredNumberFetcher();
    const validator = vi.fn().mockReturnValue(true);

    const first = cache.getOrFetchValidated("game:1", fetcher, validator);
    const second = cache.getOrFetchValidated("game:1", fetcher, validator);

    await expectCoalescedNumberFetch(setexMock, fetcher, resolveFetcher, [
      first,
      second,
    ]);
  });
});
