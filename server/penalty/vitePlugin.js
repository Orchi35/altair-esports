import {createPenaltyHandler} from './service.js';
export function penaltyDevApi(){return {name:'penalty-dev-api',configureServer(server){server.middlewares.use('/api/penalty',async(req,res)=>{
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){res.statusCode=413;res.end(JSON.stringify({error:'BODY_TOO_LARGE'}));return;}chunks.push(chunk);}
 req.body=chunks.length?Buffer.concat(chunks).toString():undefined;req.query=Object.fromEntries(new URL(req.url,'http://localhost').searchParams);
 res.status=code=>{res.statusCode=code;return res;};res.json=body=>res.end(JSON.stringify(body));await createPenaltyHandler()(req,res);
 });}};}
