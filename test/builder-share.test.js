import test from 'node:test'
import assert from 'node:assert/strict'
import {Readable} from 'node:stream'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve,dirname,basename} from 'node:path'
import {createBuilderService,createBuilderHandler,canonicalBuild,buildId,MAX_BODY_BYTES} from '../server/builder/service.js'
import {builderDevApi} from '../server/builder/vitePlugin.js'
import {createLocalBuilderStore} from '../server/builder/devStore.js'
import {DATA,makeBuild,normalizeBuild,applySelection} from '../src/pages/builder/engine.js'

const env={BUILDER_REDIS_REST_URL:'https://example.upstash.io',BUILDER_REDIS_REST_TOKEN:'test-only-token',BUILDER_RATE_SECRET:'test-only-rate-key'}
const prefix='altair:builder:v1:'
const code=value=>error=>error.code===value
function fixture() {
  let time=0
  const values=new Map(),expires=new Map(),calls=[]
  const command=async args=>{
    calls.push(args)
    const [op,...rest]=args
    if(op==='EVAL') {
      const [,count,...parts]=rest,keys=parts.slice(0,count),params=parts.slice(count)
      for(let i=0;i<keys.length;i++) {
        const key=keys[i]
        if(expires.has(key)&&expires.get(key)<=time){values.delete(key);expires.delete(key)}
        const n=Number(values.get(key)||0)+1
        values.set(key,n)
        if(n===1)expires.set(key,time+Number(params[i*2+1])*1000)
        if(n<1)return -1
        if(n>Number(params[i*2]))return i+1
      }
      return 0
    }
    if(op==='GET')return values.get(rest[0])??null
    if(op==='SET') {
      assert.deepEqual(rest.slice(2),['NX'])
      if(values.has(rest[0]))return null
      values.set(rest[0],rest[1]);return 'OK'
    }
    throw new Error('Unexpected command')
  }
  return {service:createBuilderService({env,command}),command,values,calls,expires,advance:ms=>{time+=ms}}
}
const post=(f,build=makeBuild(),clientAddress='192.0.2.1')=>f.service({method:'POST',body:{build},clientAddress})
const get=(f,id)=>f.service({method:'GET',query:{id},clientAddress:'192.0.2.1'})

test('all build fields and Unicode round trip through immutable persistent records',async()=>{
  const f=fixture()
  let build=makeBuild()
  const spec=DATA.specializations.find(item=>item.archetypeId===build.archetypeId)
  build=applySelection(build,'specialization',spec.id)
  for(const style of DATA.playstyles) {
    try {build=applySelection(build,'playstyle',style.id);break} catch { /* Find a compatible selection. */ }
  }
  Object.assign(build,{name:'Çağrı ⚽ 日本語',notes:'漢'.repeat(2000),includeAI:true,masteryCustom:true,masteryLevels:{1:10,12:55},mastery:30,facilities:[{id:0,level:1}],budget:2.5})
  const expected=normalizeBuild(build)
  const {id}=await post(f,build)
  assert.match(id,/^[A-Za-z0-9_-]{12}$/)
  assert.deepEqual(await get(f,id),{build:expected})
  const recordKey=prefix+'build:'+id
  assert.equal(f.values.get(recordKey),canonicalBuild(expected))
  assert.equal(f.expires.has(recordKey),false)
  assert.ok(f.calls.every(call=>call[0]!=='DEL'))
  assert.ok([...f.values.keys()].every(key=>key.startsWith(prefix)&&!key.includes('192.0.2.1')))
})

test('nested object ordering and ignored extra fields do not create duplicate IDs',async()=>{
  const f=fixture(),build={...makeBuild(),masteryLevels:{1:10,12:30}}
  const reordered=Object.fromEntries(Object.entries(build).reverse())
  reordered.attributes=Object.fromEntries(Object.entries(build.attributes).reverse())
  reordered.masteryLevels=Object.fromEntries(Object.entries(build.masteryLevels).reverse())
  reordered.unused='discarded by normalizer'
  const a=await post(f,build),b=await post(f,reordered)
  assert.deepEqual(a,b)
  assert.equal([...f.values.keys()].filter(key=>key.includes(':build:')).length,1)
  const different=await post(f,{...build,notes:'different'})
  assert.notEqual(different.id,a.id)
})

test('collisions fail without replacing an existing record',async()=>{
  const f=fixture(),build=makeBuild(),id=buildId(canonicalBuild(build)),key=prefix+'build:'+id
  const existing=canonicalBuild({...build,name:'different content'})
  f.values.set(key,existing)
  await assert.rejects(post(f,build),code('BUILD_ID_COLLISION'))
  assert.equal(f.values.get(key),existing)
})

test('concurrent identical shares converge and ambiguous storage writes never report success',async()=>{
  const f=fixture()
  const results=await Promise.all([post(f),post(f)])
  assert.deepEqual(results[0],results[1])
  assert.equal([...f.values.keys()].filter(key=>key.includes(':build:')).length,1)
  for(const writeResult of [false,undefined,'QUEUED',null]) {
    const service=createBuilderService({env,command:async([operation])=>operation==='EVAL'?0:operation==='SET'?writeResult:null})
    await assert.rejects(service({method:'POST',body:{build:makeBuild()}}),code('BUILDS_UNAVAILABLE'))
  }
})

test('missing and invalid IDs never expose another Redis namespace',async()=>{
  const f=fixture()
  for(const id of ['',null,[],['abcdefghijkl'],'../penalty','a'.repeat(13),'hello world!'])await assert.rejects(get(f,id),code('INVALID_BUILD_ID'))
  assert.equal(f.calls.filter(call=>call[0]==='GET').length,0)
  await assert.rejects(get(f,'abcdefghijkl'),code('BUILD_NOT_FOUND'))
})

test('invalid versions and malformed builds are rejected before storage creation',async()=>{
  const f=fixture()
  for(const build of [null,[],{}, {...makeBuild(),v:4},{...makeBuild(),v:2},{...makeBuild(),name:42},{...makeBuild(),notes:'x'.repeat(2001)},{...makeBuild(),attributes:{}}])await assert.rejects(post(f,build),code('INVALID_BUILD'))
  for(const body of ['{',null,undefined,[],{},'null'])await assert.rejects(f.service({method:'POST',body}),code('INVALID_BODY'))
  assert.equal(f.calls.filter(call=>call[0]==='SET').length,0)
})

test('UTF-8 byte limit applies to parsed and raw request bodies',async()=>{
  const f=fixture()
  await assert.rejects(f.service({method:'POST',body:{build:makeBuild(),extra:'漢'.repeat(6000)}}),code('BODY_TOO_LARGE'))
  await assert.rejects(f.service({method:'POST',body:' '.repeat(MAX_BODY_BYTES+1)}),code('BODY_TOO_LARGE'))
  assert.equal(f.calls.filter(call=>call[0]==='SET').length,0)
  // Worst-case JSON escaping of the allowed text lengths still fits the limit.
  await post(f,{...makeBuild(),name:'\ud800'.repeat(100),notes:'\ud800'.repeat(2000)})
})

test('stored records are revalidated and future versions or content corruption fail closed',async()=>{
  const f=fixture(),build=makeBuild(),id=buildId(canonicalBuild(build)),key=prefix+'build:'+id
  for(const stored of ['{',JSON.stringify({...build,v:4}),JSON.stringify({...build,notes:'changed'}),JSON.stringify({...build,unexpected:true}),'x'.repeat(MAX_BODY_BYTES+1),42]) {
    f.values.set(key,stored)
    await assert.rejects(get(f,id),code('BUILDS_UNAVAILABLE'))
  }
})

test('creation quota is ordered, idempotent requests count, and its window expires',async()=>{
  const f=fixture()
  for(let i=0;i<20;i++)await post(f)
  assert.equal(f.values.get(prefix+'rate:create-global'),20)
  const before=f.calls.length
  await assert.rejects(post(f),error=>error.code==='RATE_LIMITED'&&error.retryAfter===3600)
  assert.equal(f.values.get(prefix+'rate:create-global'),20)
  assert.equal(f.calls.length,before+2)
  await post(f,makeBuild(),'192.0.2.2')
  f.advance(3600000)
  await post(f)
  assert.equal(f.values.get(prefix+'rate:create-global'),22)
})

test('global daily creation limit bounds many IPs and expires independently',async()=>{
  const f=fixture()
  for(let i=0;i<200;i++)await post(f,{...makeBuild(),name:String(i)},`192.0.2.${1+Math.floor(i/20)}`)
  await assert.rejects(post(f,makeBuild(),'192.0.2.11'),error=>error.code==='RATE_LIMITED'&&error.retryAfter===86400)
  assert.equal([...f.values.keys()].filter(key=>key.includes(':build:')).length,200)
  f.advance(86400000)
  await post(f)
})

test('blocked read IP does not consume the global read quota',async()=>{
  const f=fixture(),{id}=await post(f)
  for(let i=0;i<120;i++)await get(f,id)
  await assert.rejects(get(f,id),code('RATE_LIMITED'))
  assert.equal(f.values.get(prefix+'rate:global:GET'),120)
})

test('IPv6 privacy variants share a /64 quota',async()=>{
  const f=fixture()
  for(let i=0;i<20;i++)await post(f,makeBuild(),`2001:db8:1234:5678::${i+1}`)
  await assert.rejects(post(f,makeBuild(),'2001:0db8:1234:5678:ffff::1'),code('RATE_LIMITED'))
  await post(f,makeBuild(),'2001:db8:1234:5679::1')
})

test('configuration is required, dedicated pairs cannot mix, and penalty credentials are supported',async()=>{
  for(const settings of [{},{...env,BUILDER_REDIS_REST_URL:'http://example.com'},{...env,BUILDER_REDIS_REST_URL:'https://user:pass@example.com'},{BUILDER_REDIS_REST_URL:env.BUILDER_REDIS_REST_URL,PENALTY_REDIS_REST_TOKEN:'fallback'}])await assert.rejects(createBuilderService({env:settings})(),code('BUILDS_NOT_CONFIGURED'))
  const f=fixture()
  const service=createBuilderService({env:{PENALTY_REDIS_REST_URL:env.BUILDER_REDIS_REST_URL,PENALTY_REDIS_REST_TOKEN:env.BUILDER_REDIS_REST_TOKEN},command:f.command})
  assert.match((await service({method:'POST',body:{build:makeBuild()}})).id,/^[A-Za-z0-9_-]{12}$/)
})

test('invalid Redis admission responses fail closed',async()=>{
  for(const result of [null,undefined,'0',-1,3,NaN,Infinity,.5,[],{}]) {
    let calls=0
    const service=createBuilderService({env,command:async()=>{calls++;return result}})
    await assert.rejects(service({method:'GET',query:{id:'abcdefghijkl'}}),code('BUILDS_UNAVAILABLE'))
    assert.equal(calls,1)
  }
})

function response() {return {headers:{},setHeader(key,value){this.headers[key]=value},status(status){this.statusCode=status;return this},json(body){this.body=body;return this},end(body){this.body=JSON.parse(body)}}}
test('handler enforces JSON and same origin, conceals errors, and never caches them',async()=>{
  const f=fixture(),handler=createBuilderHandler({env,command:f.command})
  for(const [req,status] of [[{method:'PUT'},405],[{method:'POST',headers:{'content-type':'text/plain'}},415],[{method:'POST',headers:{'content-type':'application/json','sec-fetch-site':'cross-site'}},403],[{method:'POST',headers:{'content-type':'application/json','sec-fetch-site':'same-site'}},403],[{method:'GET',query:{id:'abcdefghijkl'}},404]]) {
    const res=response();await handler(req,res)
    assert.equal(res.statusCode,status)
    assert.equal(res.headers['Cache-Control'],'no-store')
  }
  const res=response()
  await createBuilderHandler({env,command:async()=>{throw new Error('private secret')}})({method:'GET'},res)
  assert.equal(res.statusCode,503)
  assert.deepEqual(res.body,{error:'BUILDS_UNAVAILABLE',configured:false})
})

test('handler trusts only valid platform forwarding on Vercel',async()=>{
  const keys=[],command=async([op,,count,...args])=>{if(op==='EVAL'){keys.push(...args.slice(0,count));return 0}return null}
  const req={method:'GET',query:{id:'abcdefghijkl'},headers:{'x-vercel-forwarded-for':'192.0.2.10','x-forwarded-for':'192.0.2.11'},socket:{remoteAddress:'192.0.2.20'}}
  const invoke=async(settings,request)=>{await createBuilderHandler({env:settings,command})(request,response());return keys.at(-2)}
  const direct=await invoke(env,req),forwarded=await invoke({...env,VERCEL:'1'},req)
  assert.notEqual(direct,forwarded)
  assert.equal(await invoke({...env,VERCEL:'1'},{...req,headers:{'x-vercel-forwarded-for':'192.0.2.10,192.0.2.11'}}),direct)
})

test('REST transport uses configured storage and handles upstream failures safely',async()=>{
  const f=fixture(),requests=[]
  const service=createBuilderService({env,fetchImpl:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({result:await f.command(JSON.parse(options.body))})}}})
  const {id}=await service({method:'POST',body:{build:makeBuild()}})
  assert.deepEqual(await service({method:'GET',query:{id}}),{build:normalizeBuild(makeBuild())})
  assert.ok(requests.every(({url,options})=>url===env.BUILDER_REDIS_REST_URL&&options.headers.Authorization===`Bearer ${env.BUILDER_REDIS_REST_TOKEN}`&&options.signal))
  for(const reply of [{ok:false},{ok:true,json:async()=>({error:'private upstream error'})},{ok:true,json:async()=>({})}])await assert.rejects(createBuilderService({env,fetchImpl:async()=>reply})(),code('BUILDS_UNAVAILABLE'))
})

test('Vite middleware shares the endpoint and bounds streamed UTF-8 bodies',async()=>{
  const f=fixture();let middleware
  builderDevApi({env,command:f.command}).configureServer({middlewares:{use(path,handler){assert.equal(path,'/api/builds');middleware=handler}}})
  const req=Readable.from([Buffer.from(JSON.stringify({build:makeBuild()}))]);Object.assign(req,{method:'POST',url:'/',headers:{'content-type':'application/json'}})
  const res=response();await middleware(req,res)
  assert.equal(res.statusCode,200);assert.match(res.body.id,/^[A-Za-z0-9_-]{12}$/)
  const oversized=Readable.from([Buffer.alloc(MAX_BODY_BYTES),Buffer.from('漢')]);Object.assign(oversized,{method:'POST',url:'/',headers:{'content-type':'application/json'}})
  const rejected=response(),before=f.calls.length;await middleware(oversized,rejected)
  assert.equal(rejected.statusCode,413);assert.equal(f.calls.length,before)
})

async function temporaryStore(t) {
  const directory=await mkdtemp(join(tmpdir(),'altair-builder-share-'))
  t.after(async()=>{
    // Remove only the test-owned directory returned by mkdtemp.
    assert.equal(dirname(resolve(directory)),resolve(tmpdir()))
    assert.ok(basename(directory).startsWith('altair-builder-share-'))
    await rm(directory,{recursive:true,force:true})
  })
  return {directory,filePath:join(directory,'work','builder-shares.local')}
}

test('local development store persists across adapters and serializes concurrent duplicate and distinct writes',async t=>{
  const {filePath}=await temporaryStore(t)
  const first=createBuilderService({env,command:createLocalBuilderStore({filePath})})
  const second=createBuilderService({env,command:createLocalBuilderStore({filePath})})
  const body={build:{...makeBuild(),name:'Kalıcı ⚽'}}
  const [a,b]=await Promise.all([first({method:'POST',body}),second({method:'POST',body})])
  assert.deepEqual(a,b)
  const builds=Array.from({length:10},(_,i)=>({...makeBuild(),name:`parallel-${i}`}))
  const shared=await Promise.all(builds.map((build,i)=>(i%2?first:second)({method:'POST',body:{build}})))
  assert.equal(new Set(shared.map(item=>item.id)).size,10)
  const restarted=createBuilderService({env,command:createLocalBuilderStore({filePath})})
  assert.deepEqual(await restarted({method:'GET',query:{id:a.id}}),body)
  for(let i=0;i<shared.length;i++)assert.deepEqual(await restarted({method:'GET',query:{id:shared[i].id}}),{build:builds[i]})
  assert.equal(Object.keys(JSON.parse(await readFile(filePath,'utf8')).builds).length,11)
})

test('corrupted local file fails closed without replacing its contents',async t=>{
  const {filePath}=await temporaryStore(t)
  const command=createLocalBuilderStore({filePath}),service=createBuilderService({env,command})
  const {id}=await service({method:'POST',body:{build:makeBuild()}})
  for(const corrupt of ['{','null','{"version":2,"builds":{}}','{"version":1,"builds":[]}','{"version":1,"builds":{"bad-key":"bad-value"}}']) {
    await writeFile(filePath,corrupt)
    const handler=createBuilderHandler({env,command:createLocalBuilderStore({filePath})})
    const res=response();await handler({method:'POST',headers:{'content-type':'application/json'},body:{build:{...makeBuild(),name:'new'}}},res)
    assert.equal(res.statusCode,503)
    const read=response();await handler({method:'GET',query:{id}},read)
    assert.equal(read.statusCode,503)
    assert.equal(await readFile(filePath,'utf8'),corrupt)
  }
})

test('local adapter enforces creation quotas before growing persistent storage',async t=>{
  const {filePath}=await temporaryStore(t)
  const service=createBuilderService({env,command:createLocalBuilderStore({filePath})})
  for(let i=0;i<20;i++)await service({method:'POST',body:{build:{...makeBuild(),name:String(i)}}})
  const before=await readFile(filePath,'utf8')
  await assert.rejects(service({method:'POST',body:{build:{...makeBuild(),name:'blocked'}}}),code('RATE_LIMITED'))
  assert.equal(await readFile(filePath,'utf8'),before)
  assert.equal(Object.keys(JSON.parse(before).builds).length,20)
})

test('Vite alone selects persistent local storage when all Redis settings are absent',async t=>{
  const {directory,filePath}=await temporaryStore(t)
  function middlewareFor(settings) {
    let middleware
    builderDevApi({env:settings}).configureServer({config:{root:directory},middlewares:{use(path,handler){assert.equal(path,'/api/builds');middleware=handler}}})
    return middleware
  }
  async function invoke(middleware,method,url,body) {
    const req=Readable.from(body?[Buffer.from(JSON.stringify(body))]:[])
    Object.assign(req,{method,url,headers:{'content-type':'application/json'}})
    const res=response();await middleware(req,res);return res
  }
  const created=await invoke(middlewareFor({}),'POST','/',{build:makeBuild()})
  assert.equal(created.statusCode,200)
  const loaded=await invoke(middlewareFor({}),'GET',`/?id=${created.body.id}`)
  assert.deepEqual(loaded.body,{build:makeBuild()})
  const before=await readFile(filePath,'utf8')
  const partial=await invoke(middlewareFor({BUILDER_REDIS_REST_URL:env.BUILDER_REDIS_REST_URL}),'POST','/',{build:{...makeBuild(),name:'no fallback'}})
  assert.equal(partial.statusCode,503)
  assert.equal(partial.body.error,'BUILDS_NOT_CONFIGURED')
  assert.equal(await readFile(filePath,'utf8'),before)
  const production=response()
  await createBuilderHandler({env:{}})({method:'GET',query:{id:created.body.id}},production)
  assert.equal(production.statusCode,503)
  assert.equal(production.body.error,'BUILDS_NOT_CONFIGURED')
})
