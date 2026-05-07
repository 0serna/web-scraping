import { FastifyPluginAsync } from "fastify";
import { sendError } from "../../../shared/utils/api-helpers.js";
import { GameInfoService } from "../services/game-info-service.js";
import { extractAppId } from "../services/steam-url-parser.js";

interface InfoQueryString {
  url: string;
}

interface InfoRoutesOptions {
  gameInfoService: GameInfoService;
}

function validateUrlParam(url: unknown): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }
  return url;
}

async function fetchAndSendGameInfo(
  gameInfoService: GameInfoService,
  appId: string,
  reply: import("fastify").FastifyReply,
): Promise<void> {
  const gameInfo = await gameInfoService.getGameInfoByAppId(appId);
  await reply.code(200).send(gameInfo);
}

async function sendScrapeError(
  reply: import("fastify").FastifyReply,
): Promise<void> {
  await sendError(reply, 502, "SCRAPING_ERROR", "Unable to fetch game info");
}

export const infoRoutes: FastifyPluginAsync<InfoRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { gameInfoService } = opts;

  fastify.get<{ Querystring: InfoQueryString }>(
    "/info",
    async (request, reply) => {
      const { url } = request.query;

      const validUrl = validateUrlParam(url);
      if (!validUrl) {
        await sendError(reply, 400, "INVALID_URL", "URL parameter is required");
        return;
      }

      const appId = extractAppId(validUrl);
      if (!appId) {
        await sendError(
          reply,
          400,
          "INVALID_URL",
          "Invalid Steam URL or App ID",
        );
        return;
      }

      fastify.log.info({ appId, url: validUrl }, "Fetching game info");

      try {
        await fetchAndSendGameInfo(gameInfoService, appId, reply);
      } catch (error) {
        fastify.log.error({ err: error, appId }, "Error fetching game info");
        await sendScrapeError(reply);
      }
    },
  );
};
