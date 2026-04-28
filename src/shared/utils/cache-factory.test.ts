import { describe, expect, it, vi } from "vitest";

async function loadCreateCache(cacheDisabled: boolean) {
  vi.resetModules();

  const childLogger = { info: vi.fn(), error: vi.fn() };
  const logger = {
    child: vi.fn().mockReturnValue(childLogger),
  };

  const upstashInstance = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getOrFetch: vi.fn(),
    getOrFetchValidated: vi.fn(),
  };

  const upstashConstructorSpy = vi.fn();
  class UpstashCacheMock {
    get = upstashInstance.get;
    set = upstashInstance.set;
    delete = upstashInstance.delete;
    getOrFetch = upstashInstance.getOrFetch;
    getOrFetchValidated = upstashInstance.getOrFetchValidated;

    constructor(ttlMs: number, logger: unknown) {
      upstashConstructorSpy(ttlMs, logger);
    }
  }

  vi.doMock("../config/index.js", () => ({
    config: {
      cache: {
        isDisabled: cacheDisabled,
        upstash: {
          url: "https://upstash.test",
          token: "token",
        },
      },
    },
  }));

  vi.doMock("./upstash-cache.js", () => ({
    UpstashCache: UpstashCacheMock,
  }));

  const { createCache } = await import("./cache-factory.js");

  return {
    createCache,
    logger,
    childLogger,
    UpstashCacheMock,
    upstashConstructorSpy,
  };
}

describe("createCache", () => {
  it("returns no-op cache when caching is disabled", async () => {
    const { createCache, logger, upstashConstructorSpy } =
      await loadCreateCache(true);
    const cache = createCache<number>(1000, logger as never);

    expect(logger.child).not.toHaveBeenCalled();
    expect(upstashConstructorSpy).not.toHaveBeenCalled();

    await expect(cache.get("key")).resolves.toBeNull();
    await expect(cache.set("key", 1)).resolves.toBeUndefined();
    await expect(cache.delete("key")).resolves.toBeUndefined();

    const fetcher = vi.fn().mockResolvedValue(42);
    await expect(cache.getOrFetch("key", fetcher)).resolves.toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const validator = vi.fn().mockReturnValue(true);
    const validatedFetcher = vi.fn().mockResolvedValue(99);
    await expect(
      cache.getOrFetchValidated("key", validatedFetcher, validator),
    ).resolves.toBe(99);
    expect(validator).toHaveBeenCalledWith(99);
  });

  it("no-op cache throws when fresh value fails validation", async () => {
    const { createCache, logger } = await loadCreateCache(true);
    const cache = createCache<number>(1000, logger as never);

    const validator = vi.fn().mockReturnValue(false);
    const fetcher = vi.fn().mockResolvedValue(99);
    await expect(
      cache.getOrFetchValidated("key", fetcher, validator),
    ).rejects.toThrow("Fresh value failed validation");
  });

  it("returns Upstash cache with child logger when caching is enabled", async () => {
    const {
      createCache,
      logger,
      childLogger,
      UpstashCacheMock,
      upstashConstructorSpy,
    } = await loadCreateCache(false);

    const cache = createCache<number>(2500, logger as never);

    expect(logger.child).toHaveBeenCalledWith({}, { msgPrefix: "[Cache] " });
    expect(upstashConstructorSpy).toHaveBeenCalledWith(2500, childLogger);
    expect(cache).toBeInstanceOf(UpstashCacheMock);
  });
});
