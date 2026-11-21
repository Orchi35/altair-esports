import {getNexPlayer} from "../server/nex/playerService.js";

export function createNexPlayerHandler(load=getNexPlayer) {
  return async(req,res)=>{
    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    res.setHeader("X-Content-Type-Options","nosniff");
    if(req.method!=="GET") {res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
    const id=new URL(req.url,"http://localhost").searchParams.get("id");
    const data=await load(id);
    return res.status(data.status==="invalid"?400:data.status==="unavailable"?503:200).json(data);
  };
}
export default createNexPlayerHandler();
