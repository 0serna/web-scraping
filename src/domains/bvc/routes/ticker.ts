import { FastifyBaseLogger, FastifyPluginAsync } from "fastify";
import { sendError } from "../../../shared/utils/api-helpers.js";
import { normalizeTicker } from "../../../shared/utils/string-helpers.js";
import { TradingViewClient } from "../services/tradingview-client.js";
import { TriiClient } from "../services/trii-client.js";
import { TickerData } from "../types/ticker.js";

interface TickerParams {
  ticker: string;
}

interface TickerRoutesOptions {
  triiClient: TriiClient;
  tradingViewClient: TradingViewClient;
}

interface TryResult {
  result: TickerData | null;
  hadProviderError: boolean;
}

async function tryTrii(
  triiClient: TriiClient,
  normalizedTicker: string,
  log: FastifyBaseLogger,
): Promise<TryResult> {
  try {
    const result = await triiClient.getPriceByTicker(normalizedTicker);
    return { result, hadProviderError: false };
  } catch (error) {
    log.error({ err: error }, "Error fetching ticker from Trii");
    log.info(
      { ticker: normalizedTicker },
      "Trii failed, trying TradingView as fallback",
    );
    return { result: null, hadProviderError: true };
  }
}

async function tryTradingView(
  tradingViewClient: TradingViewClient,
  normalizedTicker: string,
  log: FastifyBaseLogger,
): Promise<TryResult> {
  try {
    const result = await tradingViewClient.getPriceByTicker(normalizedTicker);
    return { result, hadProviderError: false };
  } catch (error) {
    log.error({ err: error }, "Error fetching ticker from TradingView");
    return { result: null, hadProviderError: true };
  }
}

function sendNotFoundReply(
  reply: import("fastify").FastifyReply,
  normalizedTicker: string,
): Promise<void> {
  return sendError(
    reply,
    404,
    "TICKER_NOT_FOUND",
    `Ticker "${normalizedTicker}" not found`,
  );
}

function sendErrorReply(reply: import("fastify").FastifyReply): Promise<void> {
  return sendError(reply, 502, "FETCH_ERROR", "Error fetching ticker price");
}

async function tryTriiAndTradingView(
  triiClient: TriiClient,
  tradingViewClient: TradingViewClient,
  normalizedTicker: string,
  log: FastifyBaseLogger,
): Promise<{ result: TickerData | null; tvError: boolean }> {
  const { result, hadProviderError: triiError } = await tryTrii(
    triiClient,
    normalizedTicker,
    log,
  );

  if (result !== null) {
    return { result, tvError: false };
  }

  if (!triiError) {
    log.info(
      { ticker: normalizedTicker },
      "Ticker not found in Trii, trying TradingView",
    );
  }

  const { result: tvResult, hadProviderError: tvError } = await tryTradingView(
    tradingViewClient,
    normalizedTicker,
    log,
  );

  if (tvResult !== null) {
    return { result: tvResult, tvError: false };
  }

  return { result: null, tvError };
}

export const tickerRoutes: FastifyPluginAsync<TickerRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { triiClient, tradingViewClient } = opts;

  fastify.get<{ Params: TickerParams }>(
    "/ticker/:ticker",
    async (request, reply) => {
      const { ticker } = request.params;

      const normalizedTicker = normalizeTicker(ticker);
      if (!normalizedTicker) {
        await sendError(reply, 400, "INVALID_TICKER", "Ticker is required");
        return;
      }

      const { result, tvError } = await tryTriiAndTradingView(
        triiClient,
        tradingViewClient,
        normalizedTicker,
        fastify.log,
      );

      if (result !== null) {
        return reply.code(200).send(result);
      }

      if (!tvError) {
        await sendNotFoundReply(reply, normalizedTicker);
        return;
      }

      await sendErrorReply(reply);
    },
  );
};
