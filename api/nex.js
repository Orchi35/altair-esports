import { getNex } from "../server/nex/service.js";
import { getNexRoster } from "../server/nex/playerService.js";

export function createNexHandler(load=getNex, loadRoster=getNexRoster) {
  return async (req,res)=>{
    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Cache-Control","no-store");
    if(req.method!=="GET") {
      res.setHeader("Allow","GET");
      return res.status(405).json({error:"Method not allowed"});
    }
    const view = new URL(req.url || "/api/nex","http://localhost").searchParams.get("view");
    if (view !== null && view !== "roster") return res.status(400).json({error:"Unknown Nex view"});
    const data = view === "roster" ? await loadRoster() : await load();
    if (data.status === "unavailable") res.setHeader("Retry-After","60");
    return res.status(data.status==="unavailable"?503:200).json(data);
  };
}
export default createNexHandler();
