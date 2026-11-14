import {createBuilderHandler,MAX_BODY_BYTES} from './service.js'
import {resolve} from 'node:path'
import {createLocalBuilderStore} from './devStore.js'

export function builderDevApi(options={}) {
  return {name:'builder-dev-api',configureServer(server){
    const environment=options.env||process.env
    const hasRedis=['BUILDER_REDIS_REST_URL','BUILDER_REDIS_REST_TOKEN','PENALTY_REDIS_REST_URL','PENALTY_REDIS_REST_TOKEN'].some(key=>Boolean(environment[key]))
    // Only Vite development may use disk. Partial Redis settings deliberately
    // fail configuration validation instead of silently switching storage.
    const local=!options.command&&!hasRedis
    const handler=createBuilderHandler(local?{
      ...options,
      env:{...environment,BUILDER_REDIS_REST_URL:'https://local-builder.invalid',BUILDER_REDIS_REST_TOKEN:'local-development-only'},
      command:createLocalBuilderStore({filePath:resolve(server.config.root,'work/builder-shares.local')}),
    }:options)
    server.middlewares.use('/api/builds',async(req,res)=>{
      res.setHeader('Content-Type','application/json; charset=utf-8')
      res.setHeader('Cache-Control','no-store')
      try {
        const chunks=[];let size=0
        for await(const chunk of req){
          const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk)
          size+=buffer.length
          if(size>MAX_BODY_BYTES){res.statusCode=413;res.end(JSON.stringify({error:'BODY_TOO_LARGE'}));return}
          chunks.push(buffer)
        }
        req.body=chunks.length?Buffer.concat(chunks).toString('utf8'):undefined
        req.query=Object.fromEntries(new URL(req.url,'http://localhost').searchParams)
        res.status=code=>{res.statusCode=code;return res}
        res.json=body=>res.end(JSON.stringify(body))
        await handler(req,res)
      } catch {res.statusCode=400;res.end(JSON.stringify({error:'INVALID_BODY'}))}
    })
  }}
}
