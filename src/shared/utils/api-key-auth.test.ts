import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { createFastifyAppTracker } from "../test-utils/fastify-test-helpers.js";
import { createApiKeyOnRequestHook } from "./api-key-auth.js";

function createServer(auth: {
  isDisabled: boolean;
  apiKey: string | undefined;
}) {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", createApiKeyOnRequestHook(auth));
  app.get("/health", async () => ({ success: true }));
  return app;
}

describe("api key auth hook", () => {
  const trackApp = createFastifyAppTracker<ReturnType<typeof createServer>>();

  it("authorizes when x-api-key header is valid", async () => {
    const app = trackApp(
      createServer({ isDisabled: false, apiKey: "secret-key" }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        "x-api-key": "secret-key",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
  });

  it("falls back to apikey query when x-api-key is invalid", async () => {
    const app = trackApp(
      createServer({ isDisabled: false, apiKey: "secret-key" }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/health?apikey=secret-key",
      headers: {
        "x-api-key": "wrong-key",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("falls back to apikey query when x-api-key is empty", async () => {
    const app = trackApp(
      createServer({ isDisabled: false, apiKey: "secret-key" }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/health?apikey=secret-key",
      headers: {
        "x-api-key": "",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("authorizes when only apikey query is provided", async () => {
    const app = trackApp(
      createServer({ isDisabled: false, apiKey: "secret-key" }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/health?apikey=secret-key",
    });

    expect(response.statusCode).toBe(200);
  });

  it("prioritizes a valid header even if apikey query is invalid", async () => {
    const app = trackApp(
      createServer({ isDisabled: false, apiKey: "secret-key" }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/health?apikey=wrong-key",
      headers: {
        "x-api-key": "secret-key",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("returns 401 when both header and query are missing or invalid", async () => {
    const app = trackApp(
      createServer({ isDisabled: false, apiKey: "secret-key" }),
    );

    const missingResponse = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(missingResponse.statusCode).toBe(401);
    expect(missingResponse.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    });

    const invalidResponse = await app.inject({
      method: "GET",
      url: "/health?apikey=wrong-key",
      headers: {
        "x-api-key": "also-wrong",
      },
    });

    expect(invalidResponse.statusCode).toBe(401);
  });

  it("rejects apiKey and api_key query aliases", async () => {
    const app = trackApp(
      createServer({ isDisabled: false, apiKey: "secret-key" }),
    );

    const camelCaseResponse = await app.inject({
      method: "GET",
      url: "/health?apiKey=secret-key",
    });

    const snakeCaseResponse = await app.inject({
      method: "GET",
      url: "/health?api_key=secret-key",
    });

    expect(camelCaseResponse.statusCode).toBe(401);
    expect(snakeCaseResponse.statusCode).toBe(401);
  });
});
