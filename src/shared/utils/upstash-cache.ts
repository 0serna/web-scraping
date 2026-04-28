import { Redis } from "@upstash/redis";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../config/index.js";
import type { Cache } from "../types/cache.js";

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    if (!config.cache.upstash.url || !config.cache.upstash.token) {
      throw new Error("UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set");
    }

    redisClient = new Redis({
      url: config.cache.upstash.url,
      token: config.cache.upstash.token,
    });
  }

  return redisClient;
}

export class UpstashCache<T> implements Cache<T> {
  private readonly redis: Redis;
  private pendingRequests = new Map<string, Promise<T>>();
  private readonly ttlSeconds: number;
  private readonly keyPrefix = "ws:";
  private readonly logger: FastifyBaseLogger;

  constructor(ttlMs: number, logger: FastifyBaseLogger) {
    this.redis = getRedisClient();
    this.ttlSeconds = Math.ceil(ttlMs / 1000);
    this.logger = logger;
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        return null;
      }

      return value as T;
    } catch (error) {
      this.logger.error({ err: error, key }, "Error getting value from cache");
      return null;
    }
  }

  async set(key: string, data: T): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      await this.redis.setex(fullKey, this.ttlSeconds, data);
    } catch (error) {
      this.logger.error({ err: error, key }, "Error setting value in cache");
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      await this.redis.del(fullKey);
    } catch (error) {
      this.logger.error({ err: error, key }, "Error deleting value from cache");
    }
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      this.logger.debug({ key }, "Cache hit");
      return cached;
    }

    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    const promise = fetcher()
      .then(async (result) => {
        await this.set(key, result);
        this.logger.debug({ key }, "Cache miss - stored new value");
        return result;
      })
      .catch((error) => {
        this.logger.error({ err: error, key }, "Error fetching value");
        throw error;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async getOrFetchValidated(
    key: string,
    fetcher: () => Promise<T>,
    validator: (value: T) => boolean,
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      try {
        if (validator(cached)) {
          this.logger.debug({ key }, "Validated cache hit");
          return cached;
        }
      } catch (error) {
        this.logger.warn(
          { err: error, key },
          "Cached value validation threw - treating as stale",
        );
      }

      this.logger.info({ key }, "Stale cache invalidation - validation failed");
      await this.delete(key);
    }

    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    const promise = fetcher()
      .then(async (result) => {
        if (!validator(result)) {
          this.logger.warn(
            { key },
            "Fresh value failed validation - not storing in cache",
          );
          throw new Error(`Fresh value failed validation for key: ${key}`);
        }

        await this.set(key, result);
        this.logger.debug({ key }, "Validated cache miss - stored new value");
        return result;
      })
      .catch((error) => {
        this.logger.error({ err: error, key }, "Error in validated fetch");
        throw error;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}
