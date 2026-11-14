import {createHash, createHmac} from 'node:crypto'
import {isIP} from 'node:net'
import {normalizeBuild} from '../../src/pages/builder/engine.js'

export const MAX_BODY_BYTES = 16 * 1024
const PREFIX = 'altair:builder:v1:'
const ID_PATTERN = /^[A-Za-z0-9_-]{12}$/

export const RATE_SCRIPT = `-- builder-ordered-rates
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('EXPIRE', key, ARGV[i * 2]) end
  if count < 1 then return -1 end
  if count > tonumber(ARGV[i * 2 - 1]) then return i end
end
return 0`

class BuildError extends Error {
  constructor(status, code, retryAfter) { super(code); this.status=status; this.code=code; this.retryAfter=retryAfter }
}
const fail=(status,code)=>{throw new BuildError(status,code)}

function sorted(value) {
  if(Array.isArray(value))return value.map(sorted)
  if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])]))
  return value
}
export function canonicalBuild(build) { return JSON.stringify(sorted(normalizeBuild(build))) }
export function buildId(canonical) { return createHash('sha256').update(canonical).digest('base64url').slice(0,12) }

function rateAddress(address) {
  if(typeof address!=='string')return 'unknown'
  if(isIP(address)===4)return address
  if(isIP(address)!==6)return 'unknown'
  const canonical=new URL(`http://[${address}]/`).hostname.slice(1,-1)
  const [left,right='']=canonical.split('::')
  const first=left?left.split(':'):[], last=right?right.split(':'):[]
  const parts=canonical.includes('::')?[...first,...Array(8-first.length-last.length).fill('0'),...last]:first
  if(parts.slice(0,5).every(part=>part==='0')&&parts[5]==='ffff')return [parseInt(parts[6],16)>>8,parseInt(parts[6],16)&255,parseInt(parts[7],16)>>8,parseInt(parts[7],16)&255].join('.')
  return `${parts.slice(0,4).join(':')}::/64`
}

function parseBody(body) {
  let text
  try { text=typeof body==='string'?body:JSON.stringify(body) } catch { fail(400,'INVALID_BODY') }
  if(typeof text!=='string')fail(400,'INVALID_BODY')
  if(Buffer.byteLength(text)>MAX_BODY_BYTES)fail(413,'BODY_TOO_LARGE')
  try { return JSON.parse(text) } catch { fail(400,'INVALID_BODY') }
}

export function createBuilderService({env=process.env,fetchImpl=globalThis.fetch,command:injectedCommand}={}) {
  function configuration() {
    // Use a complete dedicated pair when either dedicated setting is present.
    const dedicated=Boolean(env.BUILDER_REDIS_REST_URL||env.BUILDER_REDIS_REST_TOKEN)
    const url=dedicated?env.BUILDER_REDIS_REST_URL:env.PENALTY_REDIS_REST_URL
    const token=dedicated?env.BUILDER_REDIS_REST_TOKEN:env.PENALTY_REDIS_REST_TOKEN
    if(typeof url!=='string'||typeof token!=='string'||!token)fail(503,'BUILDS_NOT_CONFIGURED')
    let parsed
    try { parsed=new URL(url) } catch { fail(503,'BUILDS_NOT_CONFIGURED') }
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash)fail(503,'BUILDS_NOT_CONFIGURED')
    return {url:url.replace(/\/$/,''),token,secret:env.BUILDER_RATE_SECRET||env.PENALTY_SIGNING_SECRET||token}
  }
  async function command(args,config) {
    if(injectedCommand)return injectedCommand(args)
    const response=await fetchImpl(config.url,{method:'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)})
    if(!response.ok)fail(503,'BUILDS_UNAVAILABLE')
    const data=await response.json()
    if(!data||data.error||!Object.hasOwn(data,'result'))fail(503,'BUILDS_UNAVAILABLE')
    return data.result
  }
  async function limits(buckets,config) {
    const rejected=await command(['EVAL',RATE_SCRIPT,buckets.length,...buckets.map(([key])=>`${PREFIX}rate:${key}`),...buckets.flatMap(([,maximum,seconds])=>[maximum,seconds])],config)
    if(!Number.isInteger(rejected)||rejected<0||rejected>buckets.length)fail(503,'BUILDS_UNAVAILABLE')
    if(rejected)throw new BuildError(429,'RATE_LIMITED',buckets[rejected-1][2])
  }
  return async function execute({method='GET',query={},body,clientAddress='unknown'}={}) {
    if(!['GET','POST'].includes(method))fail(405,'METHOD_NOT_ALLOWED')
    const config=configuration()
    const address=createHmac('sha256',config.secret).update(rateAddress(clientAddress)).digest('hex')
    await limits([[`ip:${address}:${method}`,method==='GET'?120:30,60],[`global:${method}`,method==='GET'?3000:300,60]],config)
    if(method==='GET') {
      if(typeof query.id!=='string'||!ID_PATTERN.test(query.id))fail(400,'INVALID_BUILD_ID')
      const stored=await command(['GET',`${PREFIX}build:${query.id}`],config)
      if(stored===null)fail(404,'BUILD_NOT_FOUND')
      if(typeof stored!=='string'||Buffer.byteLength(stored)>MAX_BODY_BYTES)fail(503,'BUILDS_UNAVAILABLE')
      let canonical
      try { canonical=canonicalBuild(JSON.parse(stored)) } catch { fail(503,'BUILDS_UNAVAILABLE') }
      // Refuse corrupted/future-schema records rather than silently changing them.
      if(canonical!==stored||buildId(canonical)!==query.id)fail(503,'BUILDS_UNAVAILABLE')
      return {build:JSON.parse(canonical)}
    }
    const parsed=parseBody(body)
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Object.hasOwn(parsed,'build'))fail(400,'INVALID_BODY')
    let canonical
    try { canonical=canonicalBuild(parsed.build) } catch { fail(400,'INVALID_BUILD') }
    if(Buffer.byteLength(canonical)>MAX_BODY_BYTES)fail(413,'BODY_TOO_LARGE')
    // Idempotent requests count too: quotas bound work as well as permanent data.
    await limits([[`create-ip:${address}`,20,3600],['create-global',200,86400]],config)
    const id=buildId(canonical),key=`${PREFIX}build:${id}`
    const created=await command(['SET',key,canonical,'NX'],config)
    if(created==='OK')return {id}
    if(created!==null)fail(503,'BUILDS_UNAVAILABLE')
    const existing=await command(['GET',key],config)
    if(typeof existing!=='string')fail(503,'BUILDS_UNAVAILABLE')
    if(existing!==canonical)fail(409,'BUILD_ID_COLLISION')
    return {id}
  }
}

export function createBuilderHandler(options={}) {
  const execute=createBuilderService(options)
  return async(req,res)=>{
    res.setHeader('Content-Type','application/json; charset=utf-8')
    res.setHeader('Cache-Control','no-store')
    res.setHeader('X-Content-Type-Options','nosniff')
    res.setHeader('X-Robots-Tag','noindex, nofollow')
    try {
      if(req.method==='POST'&&!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))fail(415,'JSON_REQUIRED')
      if(req.method==='POST'&&['cross-site','same-site'].includes(req.headers?.['sec-fetch-site']))fail(403,'CROSS_SITE_REQUEST')
      const environment=options.env||process.env
      const forwarded=environment.VERCEL==='1'?req.headers?.['x-vercel-forwarded-for']:null
      const address=typeof forwarded==='string'&&isIP(forwarded.trim())?forwarded.trim():req.socket?.remoteAddress
      return res.status(200).json(await execute({method:req.method,query:req.query,body:req.body,clientAddress:address||'unknown'}))
    } catch(error) {
      const known=error instanceof BuildError,status=known?error.status:503
      if(status===405)res.setHeader('Allow','GET, POST')
      if(status===429)res.setHeader('Retry-After',String(error.retryAfter))
      return res.status(status).json({error:known?error.code:'BUILDS_UNAVAILABLE',...(status===503?{configured:false}:{})})
    }
  }
}
