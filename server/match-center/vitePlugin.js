import { createMatchCenterError, getMatchCenter, RETRY_AFTER_SECONDS, toResponseEnvelope } from "./service.js";

function writeHeaders(response, status) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (status === "unavailable") response.setHeader("Retry-After", String(RETRY_AFTER_SECONDS));
}

export function matchCenterDevApi() {
  return {
    name:"altair-match-center-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/match-center", async (request, response) => {
        if (request.method !== "GET") {
          response.statusCode = 405;
          response.setHeader("Allow", "GET");
          writeHeaders(response, "error");
          response.end(JSON.stringify(toResponseEnvelope(createMatchCenterError("METHOD_NOT_ALLOWED"))));
          return;
        }
        try {
          const result = await getMatchCenter();
          response.statusCode = result.statusCode;
          writeHeaders(response, result.data.meta.status);
          response.end(JSON.stringify(toResponseEnvelope(result.data)));
        } catch {
          response.statusCode = 500;
          writeHeaders(response, "error");
          response.end(JSON.stringify(toResponseEnvelope(createMatchCenterError("MATCH_CENTER_INTERNAL_ERROR"))));
        }
      });
    },
  };
}
