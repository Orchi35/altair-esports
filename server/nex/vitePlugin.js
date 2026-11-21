import handler from "../../api/nex.js";
import playerHandler from "../../api/nex-player.js";

export function nexDevApi() {
  return {name:"altair-nex-dev-api",configureServer(server) {
    server.middlewares.use((request,response,next)=>{
      const path=request.url?.split("?")[0];
      const selected=path==="/api/nex"?handler:path==="/api/nex-player"?playerHandler:null;
      if(!selected) return next();
      const adapter={setHeader:(...args)=>response.setHeader(...args),status(code){response.statusCode=code;return this;},json(data){response.end(JSON.stringify(data));}};
      selected(request,adapter).catch(next);
    });
  }};
}
