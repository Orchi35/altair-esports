import test from 'node:test'
import assert from 'node:assert/strict'
import { createPenaltyService, createPenaltyHandler, resolveShot, weekKey, SHOT_INTERVAL_MS, bestLeaderboardEntries } from '../server/penalty/service.js'
import { normalizePlayerId, playerRankingKey } from '../src/pages/penalty/playerId.js'

const env = { PENALTY_REDIS_REST_URL: 'https://example.upstash.io', PENALTY_REDIS_REST_TOKEN: 'test-only', PENALTY_SIGNING_SECRET: 'test-secret-with-at-least-32-characters' }

function fixture() {
  let time = Date.UTC(2026, 10, 12, 12)
  let id = 0
  const strings = new Map()
  const ranks = new Map()
  const command = async ([operation, ...args]) => {
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
      if (strings.get(keys[0]) !== values[0]) return 0
      if (script.includes('penalty-advance')) {
        strings.set(keys[0], values[1])
        return 1
      }
      if (strings.has(keys[1])) return 0
      strings.set(keys[1], '1')
      const legacyMatches = JSON.parse(values[5])
      for (const [index,key] of keys.slice(2).entries()) {
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
  return { service, command, ranks, currentWeek:() => weekKey(time), advance: (ms = SHOT_INTERVAL_MS) => { time += ms } }
}
const post = (service, body) => service({ method: 'POST', body })
const expectCode = code => error => error.code === code

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

async function completeRound(f, power=1) {
  let {token}=await post(f.service,{action:'start'})
  for(let i=0;i<10;i++){
    const next=await post(f.service,{action:'shot',token,x:.1,y:.1,power})
    token=next.token
    f.advance()
  }
  return token
}

test('lower scores compact legacy duplicates while preserving separate weekly and all-time bests',async()=>{
  const f=fixture()
  const all='altair:penalty:v1:all',week=f.currentWeek()
  f.ranks.set(all,[JSON.stringify({id:'old1',name:'ÇAĞRI',score:1400}),JSON.stringify({id:'old2',playerId:'Çağrı',score:900})])
  f.ranks.set(week,[JSON.stringify({id:'old3',playerId:'Çağrı',score:700}),JSON.stringify({id:'old4',playerId:'ÇAĞRI',score:400})])
  const token=await completeRound(f,0)
  await post(f.service,{action:'submit',token,playerId:'çağrı'})
  assert.equal(f.ranks.get(all).length,1)
  assert.equal(f.ranks.get(week).length,1)
  assert.equal((await f.service({query:{period:'all'}})).entries[0].score,1400)
  assert.equal((await f.service()).entries[0].score,700)
  await assert.rejects(post(f.service,{action:'submit',token,playerId:'çağrı'}),expectCode('SESSION_ALREADY_USED'))
})

test('concurrent rounds for one handle retain only the highest valid score',async()=>{
  const f=fixture()
  const high=await completeRound(f,1),low=await completeRound(f,0)
  const results=await Promise.all([
    post(f.service,{action:'submit',token:high,playerId:'ORC-HI'}),
    post(f.service,{action:'submit',token:low,playerId:'orc-hi'})
  ])
  const highest=Math.max(...results.map(r=>r.entry.score))
  assert.ok(highest>0)
  for(const period of ['week','all']){
    const entries=(await f.service({query:{period}})).entries
    assert.equal(entries.length,1)
    assert.equal(entries[0].score,highest)
  }
  assert.equal(f.ranks.get('altair:penalty:v1:all').length,1)
  assert.equal(f.ranks.get(f.currentWeek()).length,1)
})

test('a new week gets its own personal best without resetting the all-time record',async()=>{
  const f=fixture()
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
  for (const id of [null,42,'',' ','a','a'.repeat(25),'bad id','<script>','id@example.com','bad\nid']) assert.equal(normalizePlayerId(id),'')
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
  await assert.rejects(post(service, { action: 'shot', token: `${token}x`, x: 0.5, y: 0.5, power: 0.75 }), expectCode('INVALID_SESSION'))
  for (const invalid of [-0.1, 1.01, '0.5', null, Infinity]) {
    await assert.rejects(post(service, { action: 'shot', token, x: invalid, y: 0.5, power: 0.75 }), expectCode('INVALID_SHOT'))
  }
  await assert.rejects(post(service, { action: 'submit', token, playerId: 'Altair', score: 99999 }), expectCode('GAME_NOT_FINISHED'))
})

test('atomic progression accepts one concurrent shot and enforces shot timing', async () => {
  const { service, advance } = fixture()
  const { token } = await post(service, { action: 'start' })
  const request = { action: 'shot', token, x: 0.1, y: 0.1, power: 0.75 }
  const outcomes = await Promise.allSettled([post(service, request), post(service, request)])
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1)
  assert.equal(outcomes.find(outcome => outcome.status === 'rejected').reason.code, 'SESSION_ALREADY_USED')
  const next = outcomes.find(outcome => outcome.status === 'fulfilled').value
  await assert.rejects(post(service, { ...request, token: next.token }), expectCode('SHOT_TOO_SOON'))
  advance()
  assert.equal((await post(service, { ...request, token: next.token })).shot, 2)
})

test('ten server-scored shots submit once into both persistent rankings', async () => {
  const { service, advance } = fixture()
  let { token } = await post(service, { action: 'start' })
  let total = 0
  for (let shot = 1; shot <= 10; shot++) {
    const next = await post(service, { action: 'shot', token, x: 0.1, y: 0.1, power: 0.75, score: 99999 })
    total += next.result.points
    assert.equal(next.total, total)
    assert.equal(next.shot, shot)
    assert.equal(next.finished, shot === 10)
    token = next.token
    advance()
  }
  await assert.rejects(post(service, { action: 'shot', token, x: 0, y: 0, power: 0.7 }), expectCode('GAME_FINISHED'))
  await assert.rejects(post(service, { action: 'submit', token, playerId: '<script>' }), expectCode('INVALID_PLAYER_ID'))
  for (const playerId of ['', 'a', 'bad id', 'a'.repeat(25)]) await assert.rejects(post(service, { action:'submit', token, playerId }),expectCode('INVALID_PLAYER_ID'))
  await assert.rejects(post(service, { action:'submit', token, name:'Legacy name' }),expectCode('INVALID_PLAYER_ID'))
  const submissions = await Promise.allSettled([post(service, { action: 'submit', token, playerId: ' ORC-HI ', score: 99999 }), post(service, { action: 'submit', token, playerId: 'ORC-HI' })])
  assert.equal(submissions.filter(item => item.status === 'fulfilled').length, 1)
  for (const period of ['week', 'all']) assert.deepEqual(await service({ query: { period } }), { configured: true, entries: [{ playerId: 'ORC-HI', score: total }] })
})

test('sessions expire and weeks use Monday UTC boundaries', async () => {
  const { service, advance } = fixture()
  const { token } = await post(service, { action: 'start' })
  advance(30 * 60 * 1000)
  await assert.rejects(post(service, { action: 'shot', token, x: 0.1, y: 0.1, power: 0.7 }), expectCode('SESSION_EXPIRED'))
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
