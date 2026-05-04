import { expect, vi } from "vitest";

export function createApiHelpersMocks() {
  const fetchWithTimeout = vi.fn();
  const buildFetchHeaders = vi
    .fn()
    .mockImplementation((headers?: Record<string, string>) => headers ?? {});

  return {
    fetchWithTimeout,
    buildFetchHeaders,
  };
}

function createPassthroughCacheGetOrFetchValidatedMock<T>() {
  return vi.fn(
    async (
      _key: string,
      fetcher: () => Promise<T>,
      validator: (value: T) => boolean,
    ) => {
      void validator;
      return fetcher();
    },
  );
}

export function createPassthroughRateLimiterMock() {
  return vi.fn(async (fn: () => Promise<unknown>) => fn());
}

export function createMockLogger() {
  return { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() };
}

function createServiceModuleMocks<T>(
  getOrFetchValidatedImpl?: (
    key: string,
    fetcher: () => Promise<T>,
    validator: (value: T) => boolean,
  ) => Promise<T>,
) {
  const getOrFetchValidated = getOrFetchValidatedImpl
    ? vi.fn(getOrFetchValidatedImpl)
    : createPassthroughCacheGetOrFetchValidatedMock<T>();

  const createCache = vi.fn().mockReturnValue({
    getOrFetchValidated,
  });

  const { fetchWithTimeout, buildFetchHeaders } = createApiHelpersMocks();

  return {
    getOrFetchValidated,
    createCache,
    fetchWithTimeout,
    buildFetchHeaders,
  };
}

export function mockServiceModuleDependencies<T>(
  getOrFetchValidatedImpl?: (
    key: string,
    fetcher: () => Promise<T>,
    validator: (value: T) => boolean,
  ) => Promise<T>,
) {
  const mocks = createServiceModuleMocks<T>(getOrFetchValidatedImpl);

  vi.doMock("../utils/cache-factory.js", () => ({
    createCache: mocks.createCache,
  }));

  vi.doMock("../utils/api-helpers.js", () => ({
    fetchWithTimeout: mocks.fetchWithTimeout,
    buildFetchHeaders: mocks.buildFetchHeaders,
  }));

  return mocks;
}

export function expectJsonFetchWithRateLimit(
  createRateLimiter: ReturnType<typeof vi.fn>,
  rateLimiter: ReturnType<typeof vi.fn>,
  buildFetchHeaders: ReturnType<typeof vi.fn>,
  fetchWithTimeout: ReturnType<typeof vi.fn>,
  url: string,
) {
  expect(createRateLimiter).toHaveBeenCalledWith(10);
  expect(rateLimiter).toHaveBeenCalledTimes(1);
  expect(buildFetchHeaders).toHaveBeenCalledWith({
    Accept: "application/json",
  });
  expect(fetchWithTimeout).toHaveBeenCalledWith(url, {
    headers: {
      Accept: "application/json",
    },
  });
}
