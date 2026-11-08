import { getVpg } from "./service.js";
import { getVpgRoster } from "./rosterService.js";

export function vpgDevApi() {
  return { name:"altair-vpg-dev-api", configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const path = request.url?.split("?")[0];
      const load = path === "/api/vpg" ? getVpg : path === "/api/vpg-roster" ? getVpgRoster : null;
      if (!load) return next();
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      if (request.method !== "GET") {
        response.statusCode = 405;
        response.setHeader("Allow", "GET");
        response.end(JSON.stringify({ error:"Method not allowed" }));
        return;
      }
      const data = await load();
      response.statusCode = data.status === "unavailable" ? 503 : 200;
      response.end(JSON.stringify(data));
    });
  } };
}
