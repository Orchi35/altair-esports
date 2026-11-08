import {getPlayerProfile} from "../server/vpg/playerService.js";
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
  const data=await getPlayerProfile(req.query?.id);
  return res.status(data.status==="invalid"?400:data.status==="not-found"?404:data.status==="unavailable"?503:200).json(data);
}
