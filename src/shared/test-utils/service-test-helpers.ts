import { vi } from "vitest";

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

export function createServiceModuleMocks<T>(
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
