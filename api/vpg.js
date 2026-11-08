import { getVpg } from "../server/vpg/service.js";

export function createVpgHandler(load = getVpg) {
  return async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error:"Method not allowed" });
    }
    const data = await load();
    return res.status(data.status === "unavailable" ? 503 : 200).json(data);
  };
}

export default createVpgHandler();
