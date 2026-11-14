import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createPenaltyService, createPenaltyHandler, resolveShot, weekKey, SHOT_INTERVAL_MS, bestLeaderboardEntries } from '../server/penalty/service.js'
import { normalizePlayerId, playerRankingKey } from '../src/pages/penalty/playerId.js'
import {powerFromMeter,goalPoints,PERFECT_WINDOW_HALF_WIDTH} from '../src/pages/penalty/shotModel.js'

const env = { PENALTY_REDIS_REST_URL: 'https://example.upstash.io', PENALTY_REDIS_REST_TOKEN: 'test-only', PENALTY_SIGNING_SECRET: 'test-secret-with-at-least-32-characters' }

function fixture() {
  let time = Date.UTC(2026, 10, 12, 12)
  let id = 0
  let delay = 0
  const strings = new Map()
  const ranks = new Map()
  const expires = new Map()
  const command = async ([operation, ...args]) => {
    time += delay
    if (operation === 'SET') {
      if (strings.has(args[0])) return null
      strings.set(args[0], args[1])
      return 'OK'
    }
    if (operation === 'ZREVRANGE') return [...(ranks.get(args[0]) || [])].sort((a, b) => JSON.parse(b).score - JSON.parse(a).score).slice(Number(args[1]), Number(args[2]) + 1)
    if (operation === 'EVAL') {
      const [script, count, ...rest] = args
      const keys = rest.slice(0, count)
      const values = rest.slice(count)
      if (script.includes('penalty-rate')) {
        if ((expires.get(keys[0]) || 0) <= time) strings.delete(keys[0])
        const n = Number(strings.get(keys[0]) || 0) + 1
        strings.set(keys[0], n)
        if (n === 1) expires.set(keys[0], time + Number(values[0]) * 1000)
        return n
      }
      if (script.includes('penalty-start')) {
        if (strings.has(keys[0])) return 0
        strings.set(keys[0], values[0]); strings.set(keys[1], values[1]); return 1
      }
      if (script.includes('penalty-claim')) {
        const existing = strings.get(keys[0])
        if (existing) return existing === values[0] ? 1 : 0
        if (values[1] === '1') return 0
        strings.set(keys[0], values[0])
        return 1
      }
      if (strings.get(keys[0]) !== values[0]) return 0
      if (script.includes('penalty-advance')) {
        if (strings.get(keys[1]) !== values[3]) return 0
        strings.set(keys[0], values[1])
        return 1
      }
      if (strings.get(keys[4]) !== values[6] || strings.has(keys[1])) return 0
      strings.set(keys[1], '1')
      const legacyMatches = JSON.parse(values[5])
      for (const [index,key] of keys.slice(2, 4).entries()) {
        const old = ranks.get(key) || []
        const matches = member => legacyMatches[index].includes(member) || JSON.parse(member).playerKey === values[4]
        const candidates = [JSON.parse(values[2]), ...old.filter(matches).map(member => JSON.parse(member))]
        const winner = candidates.reduce((best,entry) => entry.score >= best.score ? entry : best)
        winner.playerId ??= winner.name
        winner.playerKey = values[4]
        ranks.set(key, [...old.filter(member => !matches(member)), JSON.stringify(winner)].sort((a,b) => JSON.parse(b).score-JSON.parse(a).score).slice(0,1000))
      }
      strings.delete(keys[0])
      return 1
    }
    throw new Error(`Unexpected Redis command: ${operation}`)
  }
  const service = createPenaltyService({ env, command, now: () => time, randomId: () => `test-${++id}` })
  return { service, command, ranks, setDelay: ms => { delay = ms }, currentWeek:() => weekKey(time), now:() => time, advance: (ms = SHOT_INTERVAL_MS) => { time += ms } }
}
const post = (service, body) => service({ method: 'POST', body: body.action === 'start' ? { playerId: 'ORC-HI', ownerToken: 'a'.repeat(64), ...body } : body })
const expectCode = code => error => error.code === code
async function shoot(f, token, x=.1, y=.1, offset=.5) {
  const armed = await post(f.service, {action:'arm', token})
  f.advance(armed.timing.startsAt - f.now() + Math.round(armed.timing.legMs * offset))
  const next = await post(f.service, {action:'shot', token:armed.token, x, y})
  f.advance()
  return next
}

test('ranked learning comes from signed session history, not client overrides',async()=>{
  const f=fixture()
  let {token}=await post(f.service,{action:'start'})
  for(let i=1;i<=5;i++) {
    const next=await shoot(f,token,.2,.2)
    assert.equal(next.result.keeperRead.streak,i)
    assert.ok(Math.abs(next.result.saveChance-(.1+(i-1)*.08))<1e-12)
    token=next.token
  }
  const changed=await shoot(f,token,.8,.2)
  assert.equal(changed.result.keeperRead.streak,1)
  assert.equal(changed.result.saveChance,.1)
  const fresh=await post(f.service,{action:'start'})
  const first=await shoot(f,fresh.token,.2,.2)
  assert.equal(first.result.saveChance,.1)
})

test('historical rankings merge case and Unicode variants before selecting the top 50', () => {
  const rows = Array.from({length:60},(_,i)=>JSON.stringify({id:i,playerId:i%2?'ORC-HI':'orc-hi',score:1400-i}))
  rows.push(JSON.stringify({name:'Çağrı',score:1000}),JSON.stringify({playerId:'ÇAĞRI',score:1100}),JSON.stringify({playerId:'C\u0327ag\u0306rı',score:1050}))
  rows.push('broken',JSON.stringify({playerId:'bad id',score:999}),JSON.stringify({playerId:'valid',score:-1}))
  for(let i=0;i<60;i++) rows.push(JSON.stringify({playerId:`player_${i}`,score:900-i}))
  const entries=bestLeaderboardEntries(rows.reverse())
  assert.equal(entries.length,50)
  assert.equal(entries[0].score,1400)
  assert.equal(playerRankingKey(entries[0].playerId),'orc-hi')
  assert.equal(entries[1].score,1100)
  assert.equal(new Set(entries.map(e=>playerRankingKey(e.playerId))).size,50)
  assert.equal(playerRankingKey(' ORC-HI '),playerRankingKey('orc-hi'))
})

test('historical two-character handles remain visible and distinct', () => {
  const entries = bestLeaderboardEntries([JSON.stringify({name:'AB',score:20}), JSON.stringify({name:'CD',score:10})])
  assert.deepEqual(entries, [{playerId:'AB',score:20}, {playerId:'CD',score:10}])
})

async function completeRound(f, power=1, playerId='ORC-HI') {
  let {token}=await post(f.service,{action:'start',playerId})
  for(let i=0;i<10;i++){
    const next=await shoot(f,token,.1,.1,power/2)
    token=next.token
  }
  return token
}

test('lower scores compact legacy duplicates while preserving separate weekly and all-time bests',async()=>{
  const f=fixture()
  const all='altair:penalty:v1:all',week=f.currentWeek()
  const token=await completeRound(f,0,'Çağrı')
  f.ranks.set(all,[JSON.stringify({id:'old1',name:'ÇAĞRI',score:1400}),JSON.stringify({id:'old2',playerId:'Çağrı',score:900})])
  f.ranks.set(week,[JSON.stringify({id:'old3',playerId:'Çağrı',score:700}),JSON.stringify({id:'old4',playerId:'ÇAĞRI',score:400})])
  await post(f.service,{action:'submit',token,playerId:'çağrı'})
  assert.equal(f.ranks.get(all).length,1)
  assert.equal(f.ranks.get(week).length,1)
  assert.equal((await f.service({query:{period:'all'}})).entries[0].score,1400)
  assert.equal((await f.service()).entries[0].score,700)
  await assert.rejects(post(f.service,{action:'submit',token,playerId:'çağrı'}),expectCode('SESSION_ALREADY_USED'))
})

test('new rounds supersede completed rounds before submission', async()=>{
 const f=fixture(); const old=await completeRound(f,1); const current=await completeRound(f,0)
 await assert.rejects(post(f.service,{action:'submit',token:old,playerId:'ORC-HI'}))
 await post(f.service,{action:'submit',token:current,playerId:'ORC-HI'})
 assert.equal((await f.service()).entries.length,1)
})

test('a new week gets its own personal best without resetting the all-time record',async()=>{
  const f=fixture()
  await post(f.service,{action:'start'})
  f.ranks.set('altair:penalty:v1:all',[JSON.stringify({playerId:'ORC-HI',score:1500})])
  f.advance(7*24*60*60*1000)
  const token=await completeRound(f,0)
  await post(f.service,{action:'submit',token,playerId:'orc-hi'})
  assert.equal((await f.service()).entries[0].score,0)
  assert.equal((await f.service({query:{period:'all'}})).entries[0].score,1500)
})


test('player IDs preserve public game handles and reject invalid input', () => {
  for (const id of ['ORC-HI','Tru-Ardas','mcb06099','player_27','player.27','Çağrı']) assert.equal(normalizePlayerId(` ${id} `),id)
  assert.equal(normalizePlayerId('a'.repeat(24)), 'a'.repeat(24))
  for (const id of [null,42,'',' ','a','ab','a'.repeat(25),'bad id','<script>','id@example.com','bad\nid']) assert.equal(normalizePlayerId(id),'')
})

test('leaderboard is unavailable rather than fabricated without configuration', async () => {
  const service = createPenaltyService({ env: {} })
  await assert.rejects(service(), expectCode('LEADERBOARD_NOT_CONFIGURED'))
  await assert.rejects(post(service, { action: 'start' }), expectCode('LEADERBOARD_NOT_CONFIGURED'))
})

test('fresh configured leaderboard starts empty and validates periods', async () => {
  const { service } = fixture()
  assert.deepEqual(await service(), { configured: true, entries: [] })
  await assert.rejects(service({ query: { period: 'month' } }), expectCode('INVALID_PERIOD'))
})

test('shot resolver is deterministic, bounded, and validates coordinates', () => {
  const input = { id: 'game', shot: 1, x: 0.1, y: 0.1, power: 0.75 }
  assert.deepEqual(resolveShot(input, env.PENALTY_SIGNING_SECRET), resolveShot(input, env.PENALTY_SIGNING_SECRET))
  for (let shot = 0; shot < 100; shot++) {
    const result = resolveShot({ ...input, shot }, env.PENALTY_SIGNING_SECRET)
    assert.ok(result.points >= 0 && result.points <= 150)
    assert.ok(result.keeperX >= 0 && result.keeperX <= 1 && result.keeperY >= 0 && result.keeperY <= 1)
  }
  assert.equal(resolveShot({ ...input, power: 0.1 }, 'secret').goal, false)
  assert.throws(() => resolveShot({ ...input, x: NaN }, 'secret'), expectCode('INVALID_SHOT'))
})

test('server rejects tampering, out-of-range shots, and early submission', async () => {
  const { service } = fixture()
  const { token } = await post(service, { action: 'start' })
  await assert.rejects(post(service, { action: 'shot', token: `${token}x`, x: 0.5, y: 0.5 }), expectCode('INVALID_SESSION'))
  for (const invalid of [-0.1, 1.01, '0.5', null, Infinity]) {
    await assert.rejects(post(service, { action: 'shot', token, x: invalid, y: 0.5 }), expectCode('INVALID_SHOT'))
  }
  await assert.rejects(post(service, { action: 'submit', token, playerId: 'ORC-HI', score: 99999 }), expectCode('GAME_NOT_FINISHED'))
})

test('arming enforces timing and atomic replay protection', async()=>{
 const f=fixture(); const {token}=await post(f.service,{action:'start'})
 await assert.rejects(post(f.service,{action:'shot',token,x:.1,y:.1}),expectCode('SHOT_NOT_ARMED'))
 const arms=await Promise.allSettled([post(f.service,{action:'arm',token}),post(f.service,{action:'arm',token})])
 assert.equal(arms.filter(x=>x.status==='fulfilled').length,1)
 const armed=arms.find(x=>x.status==='fulfilled').value
 assert.equal(armed.timing.startsAt-armed.serverNow,800); assert.equal(armed.timing.expiresAt-armed.timing.startsAt,30000)
 await assert.rejects(post(f.service,{action:'arm',token:armed.token}),expectCode('SHOT_ALREADY_ARMED'))
 await assert.rejects(post(f.service,{action:'shot',token:armed.token,x:.1,y:.1}),expectCode('SHOT_NOT_READY'))
 f.advance(armed.timing.startsAt-f.now()+armed.timing.legMs)
 const req={action:'shot',token:armed.token,x:.1,y:.1}
 const shots=await Promise.allSettled([post(f.service,req),post(f.service,req)])
 assert.equal(shots.filter(x=>x.status==='fulfilled').length,1)
 const next=shots.find(x=>x.status==='fulfilled').value
 const prearmed=await post(f.service,{action:'arm',token:next.token})
 assert.equal(prearmed.timing.startsAt, f.now()+SHOT_INTERVAL_MS+800)
 await assert.rejects(post(f.service,{action:'shot',token:prearmed.token,x:.1,y:.1}),expectCode('SHOT_TOO_SOON'))
 f.advance(prearmed.timing.startsAt-f.now()+Math.round(prearmed.timing.legMs/2))
 assert.equal((await post(f.service,{action:'shot',token:prearmed.token,x:.1,y:.1})).shot,2)
})

test('client power and score overrides cannot control server timing', async()=>{
 const f=fixture(); const {token}=await post(f.service,{action:'start'}); const armed=await post(f.service,{action:'arm',token})
 f.advance(armed.timing.startsAt-f.now())
 for(const field of ['power','meterPosition','score','clientTime','keeperRead','streak']) await assert.rejects(post(f.service,{action:'shot',token:armed.token,x:.1,y:.1,[field]:1}),expectCode('CLIENT_SHOT_OVERRIDE'))
 const bad=await post(f.service,{action:'shot',token:armed.token,x:.1,y:.1}); assert.equal(bad.result.power,0)
 f.advance(); assert.equal((await shoot(f,bad.token)).result.power,1)
})

test('armed shots expire at the server deadline', async()=>{
 const f=fixture(); const {token}=await post(f.service,{action:'start'}); const armed=await post(f.service,{action:'arm',token})
 f.advance(armed.timing.expiresAt-f.now())
 await assert.rejects(post(f.service,{action:'shot',token:armed.token,x:.1,y:.1}),expectCode('SHOT_EXPIRED'))
})

test('ten server-scored shots submit once into both persistent rankings', async()=>{
 const f=fixture(); let {token}=await post(f.service,{action:'start'}); let total=0
 for(let shot=1;shot<=10;shot++){const next=await shoot(f,token); total+=next.result.points; assert.equal(next.total,total); assert.equal(next.shot,shot); assert.equal(next.finished,shot===10); token=next.token}
 await assert.rejects(post(f.service,{action:'arm',token}),expectCode('GAME_FINISHED'))
 for(const playerId of ['','a','ab','bad id','a'.repeat(25)]) await assert.rejects(post(f.service,{action:'submit',token,playerId}),expectCode('INVALID_PLAYER_ID'))
 const submissions=await Promise.allSettled([post(f.service,{action:'submit',token,playerId:' ORC-HI '}),post(f.service,{action:'submit',token,playerId:'ORC-HI'})])
 assert.equal(submissions.filter(x=>x.status==='fulfilled').length,1)
 for(const period of ['week','all']) assert.deepEqual(await f.service({query:{period}}),{configured:true,entries:[{playerId:'ORC-HI',score:total}]})
})

test('sessions expire and weeks use Monday UTC boundaries', async () => {
  const { service, advance } = fixture()
  const { token } = await post(service, { action: 'start' })
  advance(30 * 60 * 1000)
  await assert.rejects(post(service, { action: 'shot', token, x: 0.1, y: 0.1 }), expectCode('SESSION_EXPIRED'))
  assert.ok(weekKey(Date.parse('2026-11-15T23:59:59Z')).endsWith('2026-11-09'))
  assert.ok(weekKey(Date.parse('2026-11-16T00:00:00Z')).endsWith('2026-11-16'))
})

test('HTTP errors are structured, uncached, and conceal internal details', async () => {
  const headers = {}
  const response = { setHeader: (key, value) => { headers[key] = value }, status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
  await createPenaltyHandler({ env: {} })({ method: 'GET' }, response)
  assert.equal(response.code, 503)
  assert.deepEqual(response.body, { error: 'LEADERBOARD_NOT_CONFIGURED', configured: false })
  assert.equal(headers['Cache-Control'], 'no-store')
  await createPenaltyHandler({ env, command: async () => { throw new Error('private token') } })({ method: 'GET' }, response)
  assert.equal(response.code, 503)
  assert.equal(response.body.error, 'LEADERBOARD_UNAVAILABLE')
  assert.ok(!JSON.stringify(response.body).includes('private'))
  await createPenaltyHandler({ env })({ method: 'POST', body: '{bad' }, response)
  assert.equal(response.code, 400)
})

test('ownership claims are atomic and the same owner can resume', async () => {
  const { service } = fixture()
  const outcomes = await Promise.allSettled([
    post(service, { action:'start', playerId:'Racer', ownerToken:'a'.repeat(64) }),
    post(service, { action:'start', playerId:'racer', ownerToken:'b'.repeat(64) })
  ])
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1)
  const winner = outcomes.findIndex(x => x.status === 'fulfilled')
  await post(service, { action:'start', playerId:'RACER', ownerToken:(winner === 0 ? 'a' : 'b').repeat(64) })
  assert.equal(outcomes.find(x => x.status === 'rejected').reason.code, 'PLAYER_ID_TAKEN')
})

test('unowned legacy names cannot be claimed across case and Unicode variants', async () => {
  for (const period of ['all', 'week']) {
    const f = fixture()
    f.ranks.set(period === 'all' ? 'altair:penalty:v1:all' : f.currentWeek(), [JSON.stringify({name:'ÇAĞRI',score:99})])
    await assert.rejects(post(f.service, {action:'start', playerId:'c\u0327ag\u0306rı'}), expectCode('PLAYER_ID_TAKEN'))
  }
})

test('start and submit enforce identity and minimum length', async () => {
  const f = fixture()
  for (const playerId of ['', 'a', 'ab']) await assert.rejects(post(f.service, {action:'start', playerId}), expectCode('INVALID_PLAYER_ID'))
  for (const ownerToken of ['', 'A'.repeat(64), 'a'.repeat(63)]) await assert.rejects(post(f.service, {action:'start', ownerToken}), expectCode('IDENTITY_REQUIRED'))
  const token = await completeRound(f)
  await assert.rejects(post(f.service, {action:'submit', token, playerId:'Different'}), expectCode('PLAYER_ID_MISMATCH'))
  await assert.rejects(post(f.service, {action:'submit', token, playerId:'ab'}), expectCode('INVALID_PLAYER_ID'))
  await post(f.service, {action:'submit', token, playerId:'orc-hi'})
})

test('old signed sessions without a player identity cannot submit', async () => {
  const f = fixture()
  const payload = Buffer.from(JSON.stringify({id:'legacy',shot:10,total:0,exp:Date.UTC(2026,10,12,13),nextAt:0})).toString('base64url')
  const token = `${payload}.${createHmac('sha256',env.PENALTY_SIGNING_SECRET).update(payload).digest('base64url')}`
  await assert.rejects(post(f.service,{action:'submit',token,playerId:'ORC-HI'}),expectCode('SESSION_UPGRADE_REQUIRED'))
})


test('owner rate limit survives IP rotation and resets after its window', async()=>{
 const f=fixture(); const start=(address,owner='a'.repeat(64))=>f.service({method:'POST',clientAddress:address,body:{action:'start',playerId:'ORC-HI',ownerToken:owner}})
 for(let i=0;i<6;i++) await start('192.0.2.'+(i+1))
 await assert.rejects(start('192.0.2.7'),expectCode('RATE_LIMITED'))
 f.advance(60000); await start('192.0.2.7')
})

test('hourly start limit survives minute resets', async()=>{
 const f=fixture()
 for(let minute=0;minute<10;minute++) {
   for(let i=0;i<12;i++) {
     const owner=(minute*12+i).toString(16).padStart(64,'0')
     await f.service({method:'POST',clientAddress:'192.0.2.1',body:{action:'start',playerId:'player_'+(minute*12+i),ownerToken:owner}})
   }
   f.advance(60000)
 }
 await assert.rejects(f.service({method:'POST',clientAddress:'192.0.2.1',body:{action:'start',playerId:'another',ownerToken:'f'.repeat(64)}}),expectCode('RATE_LIMITED'))
 f.advance(3000000)
 await f.service({method:'POST',clientAddress:'192.0.2.1',body:{action:'start',playerId:'another',ownerToken:'f'.repeat(64)}})
})


test('request arrival time, rather than Redis latency, determines shot power', async()=>{
 const f=fixture(); const {token}=await post(f.service,{action:'start'}); const armed=await post(f.service,{action:'arm',token})
 f.advance(armed.timing.startsAt-f.now()+Math.round(armed.timing.legMs/2))
 f.setDelay(1000)
 const shot=await post(f.service,{action:'shot',token:armed.token,x:.1,y:.1})
 assert.equal(shot.result.power,1)
 assert.ok(Math.abs(shot.result.meterPosition-.5)<=PERFECT_WINDOW_HALF_WIDTH)
 assert.equal(powerFromMeter(shot.result.meterPosition),shot.result.power)
})

test('result position, power and goal points share the server arrival sample in both directions',async()=>{
 const f=fixture();let {token}=await post(f.service,{action:'start'})
 for(const offset of [.1,.45,.5,.55,.9,1.25,1.5,1.7]){
  const shot=await shoot(f,token,.3,.3,offset)
  const {meterPosition:position,power,points,goal,perfect}=shot.result
  assert.ok(position>=0&&position<=1)
  assert.equal(power,powerFromMeter(position))
  assert.equal(points,goal?goalPoints(power):0)
  assert.equal(perfect,Math.abs(position-.5)<=PERFECT_WINDOW_HALF_WIDTH)
  if(points===150)assert.equal(perfect,true)
  token=shot.token
 }
})

test('IPv6 privacy addresses in the same /64 share start limits', async()=>{
 const f=fixture()
 const start=(i,address)=>f.service({method:'POST',clientAddress:address,body:{action:'start',playerId:'player_'+i,ownerToken:i.toString(16).padStart(64,'0')}})
 for(let i=0;i<12;i++) await start(i,'2001:db8:1234:5678::'+(i+1).toString(16))
 await assert.rejects(start(12,'2001:0db8:1234:5678:aaaa:bbbb:cccc:dddd'),expectCode('RATE_LIMITED'))
 await start(13,'2001:db8:1234:5679::1')
})

test('handler enforces JSON and cross-site restrictions and trusts only platform forwarding', async()=>{
 const keys=[]
 const command=async ([op,,,key])=>{
   if(op==='EVAL') { keys.push(key); return 1 }
   if(op==='ZREVRANGE') return []
   throw new Error('unexpected command')
 }
 const response=()=>({setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}})
 const invoke=async (environment,req)=>{const res=response(); await createPenaltyHandler({env:environment,command})(req,res); return res}
 let res=await invoke(env,{method:'POST',headers:{'content-type':'text/plain'},body:{action:'start'}})
 assert.equal(res.code,415)
 res=await invoke(env,{method:'POST',headers:{'content-type':'application/json','sec-fetch-site':'cross-site'},body:{action:'start'}})
 assert.equal(res.code,403)
 const req={method:'GET',headers:{'x-vercel-forwarded-for':'192.0.2.10'},socket:{remoteAddress:'192.0.2.20'}}
 await invoke(env,req); const direct=keys.at(-2)
 await invoke({...env,VERCEL:'1'},req); const forwarded=keys.at(-2)
 assert.notEqual(direct,forwarded)
 await invoke({...env,VERCEL:'1'},{...req,headers:{'x-vercel-forwarded-for':'192.0.2.10, 192.0.2.11'}})
 assert.equal(keys.at(-2),direct)
})
