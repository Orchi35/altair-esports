import { getVpg } from "./service.js";
import { getVpgRoster } from "./rosterService.js";
import { getMatchDetail } from "./matchService.js";
import { getPlayerProfile } from "./playerService.js";
import {getVpgCup} from "./cupService.js";

export function vpgDevApi() {
  return { name:"altair-vpg-dev-api", configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const path = request.url?.split("?")[0];
      if(path === "/api/vpg-cup"){
        response.setHeader("Content-Type","application/json; charset=utf-8");response.setHeader("Cache-Control","no-store");
        if(request.method!=="GET"){response.statusCode=405;response.setHeader("Allow","GET");response.end();return;}
        const cup=await getVpgCup();response.statusCode=cup.status==="unavailable"?503:200;response.end(JSON.stringify(cup));return;
      }
      const load = path === "/api/vpg" ? getVpg : path === "/api/vpg-roster" ? getVpgRoster : path === "/api/vpg-match" ? () => getMatchDetail(new URL(request.url, "http://localhost").searchParams.get("id")) : path === "/api/vpg-player" ? () => getPlayerProfile(new URL(request.url,"http://localhost").searchParams.get("id")) : null;
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
      response.statusCode = data.status === "unavailable" ? 503 : data.status === "invalid" ? 400 : data.status === "not-found" ? 404 : 200;
      response.end(JSON.stringify(data));
    });
  } };
}
