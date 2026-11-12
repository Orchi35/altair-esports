import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { calculateShot } from '../../src/pages/penalty/shotModel.js'
import { normalizePlayerId, playerRankingKey } from '../../src/pages/penalty/playerId.js'

export const SHOT_COUNT = 10
export const SHOT_INTERVAL_MS = 700
const SESSION_MS = 30 * 60 * 1000
const PREFIX = 'altair:penalty:v1:'

// Redis performs compare-and-swap so parallel requests cannot branch a session.
export const ADVANCE_SCRIPT = `-- penalty-advance
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`

// Claim and both rankings are written together; a lost HTTP response cannot double-submit.
export const SUBMIT_SCRIPT = `-- penalty-submit
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if not redis.call('SET', KEYS[2], '1', 'NX', 'EX', ARGV[4]) then return 0 end
local legacy = cjson.decode(ARGV[6])
for board = 3, 4 do
  local aliases = {}
  for _, member in ipairs(legacy[board - 2]) do aliases[member] = true end
  local best = ARGV[3]
  local bestScore = tonumber(ARGV[2])
  local members = redis.call('ZREVRANGE', KEYS[board], 0, 999, 'WITHSCORES')
  for i = 1, #members, 2 do
    local member = members[i]
    local ok, entry = pcall(cjson.decode, member)
    if aliases[member] or (ok and type(entry) == 'table' and entry.playerKey == ARGV[5]) then
      local score = tonumber(members[i + 1])
      if score >= bestScore then best = member; bestScore = score end
      redis.call('ZREM', KEYS[board], member)
    end
  end
  local winner = cjson.decode(best)
  winner.playerKey = ARGV[5]
  winner.playerId = winner.playerId or winner.name
  winner.score = bestScore
  redis.call('ZADD', KEYS[board], bestScore, cjson.encode(winner))
end
redis.call('ZREMRANGEBYRANK', KEYS[3], 0, -1001)
redis.call('ZREMRANGEBYRANK', KEYS[4], 0, -1001)
redis.call('EXPIRE', KEYS[4], 1209600)
redis.call('DEL', KEYS[1])
return 1`

class PenaltyError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code }
}
const fail = (status, code) => { throw new PenaltyError(status, code) }
const unit = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

function readEntry(member) {
  try {
    const value = JSON.parse(member)
    const playerId = normalizePlayerId(value?.playerId ?? value?.name)
    if (!playerId || !Number.isInteger(value.score) || value.score < 0 || value.score > 1500) return null
    return { playerId, score:value.score }
  } catch { return null }
}

export function bestLeaderboardEntries(members) {
  const best = new Map()
  for (const member of members) {
    const entry = readEntry(member)
    if (!entry) continue
    const key = playerRankingKey(entry.playerId)
    if (!best.has(key) || best.get(key).score < entry.score) best.set(key, entry)
  }
  return [...best.values()].sort((a, b) => b.score - a.score || playerRankingKey(a.playerId).localeCompare(playerRankingKey(b.playerId))).slice(0, 50)
}

export function weekKey(timestamp) {
  const date = new Date(timestamp)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return `${PREFIX}week:${date.toISOString().slice(0, 10)}`
}

export function resolveShot({ id, shot, x, y, power }, secret) {
  if (![x, y, power].every(unit)) fail(400, 'INVALID_SHOT')
  const random = createHmac('sha256', secret).update(`${id}:${shot}`).digest()
  const keeperX = 0.12 + (random.readUInt32BE(0) / 0xffffffff) * 0.76
  const keeperY = 0.15 + (random.readUInt32BE(4) / 0xffffffff) * 0.7
  const saveRoll = random.readUInt32BE(8) / 0x100000000
  return calculateShot({ x, y, power, keeperX, keeperY, saveRoll })
}

export function createPenaltyService({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now, randomId = randomUUID, command: injectedCommand } = {}) {
  function configuration() {
    const url = env.PENALTY_REDIS_REST_URL
    const secret = env.PENALTY_SIGNING_SECRET
    if (!url || !env.PENALTY_REDIS_REST_TOKEN || !secret || secret.length < 32) fail(503, 'LEADERBOARD_NOT_CONFIGURED')
    let parsed
    try { parsed = new URL(url) } catch { fail(503, 'LEADERBOARD_NOT_CONFIGURED') }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) fail(503, 'LEADERBOARD_NOT_CONFIGURED')
    return { url: url.replace(/\/$/, ''), secret }
  }
  async function command(args) {
    if (injectedCommand) return injectedCommand(args)
    const { url } = configuration()
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.PENALTY_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) fail(503, 'LEADERBOARD_UNAVAILABLE')
    const data = await response.json()
    if (data.error || !Object.hasOwn(data, 'result')) fail(503, 'LEADERBOARD_UNAVAILABLE')
    return data.result
  }
  function sign(state, secret) {
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url')
    return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
  }
  function verify(token, secret) {
    if (typeof token !== 'string' || token.length > 2048) fail(400, 'INVALID_SESSION')
    const parts = token.split('.')
    if (parts.length !== 2) fail(400, 'INVALID_SESSION')
    const expected = createHmac('sha256', secret).update(parts[0]).digest('base64url')
    if (!/^[A-Za-z0-9_-]{43}$/.test(parts[1]) || !timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected))) fail(400, 'INVALID_SESSION')
    let state
    try { state = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) } catch { fail(400, 'INVALID_SESSION') }
    if (!state || typeof state.id !== 'string' || !Number.isInteger(state.shot) || state.shot < 0 || state.shot > SHOT_COUNT || !Number.isInteger(state.total) || state.total < 0 || state.total > 1500 || !Number.isFinite(state.exp) || !Number.isFinite(state.nextAt)) fail(400, 'INVALID_SESSION')
    if (state.exp <= now()) fail(410, 'SESSION_EXPIRED')
    return state
  }
  return async function execute({ method = 'GET', query = {}, body = {} } = {}) {
    if (!['GET', 'POST'].includes(method)) fail(405, 'METHOD_NOT_ALLOWED')
    const { secret } = configuration()
    if (method === 'GET') {
      const period = query.period || 'week'
      if (!['week', 'all'].includes(period)) fail(400, 'INVALID_PERIOD')
      // Read the full retained board before deduplication so old repeated rounds
      // cannot hide other players below the first 50 rows.
      const members = await command(['ZREVRANGE', period === 'all' ? `${PREFIX}all` : weekKey(now()), 0, 999])
      if (!Array.isArray(members)) fail(503, 'LEADERBOARD_UNAVAILABLE')
      const entries = bestLeaderboardEntries(members)
      return { configured: true, entries }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'INVALID_BODY')
    if (body.action === 'start') {
      const timestamp = now()
      const state = { id: randomId(), shot: 0, total: 0, exp: timestamp + SESSION_MS, nextAt: timestamp }
      const token = sign(state, secret)
      const stored = await command(['SET', `${PREFIX}session:${state.id}`, token, 'NX', 'EX', SESSION_MS / 1000])
      if (stored !== 'OK') fail(503, 'LEADERBOARD_UNAVAILABLE')
      return { token }
    }
    if (!['shot', 'submit'].includes(body.action)) fail(400, 'INVALID_ACTION')
    const state = verify(body.token, secret)
    const sessionKey = `${PREFIX}session:${state.id}`
    if (body.action === 'shot') {
      if (state.shot >= SHOT_COUNT) fail(409, 'GAME_FINISHED')
      if (![body.x, body.y, body.power].every(unit)) fail(400, 'INVALID_SHOT')
      if (now() < state.nextAt) fail(429, 'SHOT_TOO_SOON')
      const result = resolveShot({ id: state.id, shot: state.shot + 1, x: body.x, y: body.y, power: body.power }, secret)
      const next = { ...state, shot: state.shot + 1, total: state.total + result.points, nextAt: now() + SHOT_INTERVAL_MS }
      const token = sign(next, secret)
      const advanced = await command(['EVAL', ADVANCE_SCRIPT, 1, sessionKey, body.token, token, Math.max(1, Math.ceil((state.exp - now()) / 1000))])
      if (advanced !== 1) fail(409, 'SESSION_ALREADY_USED')
      return { token, result, total: next.total, shot: next.shot, finished: next.shot === SHOT_COUNT }
    }
    if (state.shot !== SHOT_COUNT) fail(409, 'GAME_NOT_FINISHED')
    const playerId = normalizePlayerId(body.playerId)
    if (!playerId) fail(400, 'INVALID_PLAYER_ID')
    const playerKey = playerRankingKey(playerId)
    const boardKeys = [`${PREFIX}all`, weekKey(now())]
    // Resolve historical Unicode/case variants in JS. The Lua transaction also
    // matches playerKey, including submissions arriving after these reads.
    const legacyMatches = await Promise.all(boardKeys.map(async key => {
      const members = await command(['ZREVRANGE', key, 0, 999])
      if (!Array.isArray(members)) fail(503, 'LEADERBOARD_UNAVAILABLE')
      return members.filter(member => playerRankingKey(readEntry(member)?.playerId) === playerKey)
    }))
    const entry = JSON.stringify({ id: state.id, playerId, playerKey, score: state.total })
    const saved = await command(['EVAL', SUBMIT_SCRIPT, 4, sessionKey, `${PREFIX}submitted:${state.id}`, ...boardKeys, body.token, state.total, entry, SESSION_MS / 1000, playerKey, JSON.stringify(legacyMatches)])
    if (saved !== 1) fail(409, 'SESSION_ALREADY_USED')
    return { submitted: true, entry: { playerId, score: state.total } }
  }
}

export function createPenaltyHandler(options = {}) {
  const execute = createPenaltyService(options)
  return async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    try {
      let body = req.body
      if (body && typeof body === 'object' && Buffer.byteLength(JSON.stringify(body)) > 4096) fail(413, 'BODY_TOO_LARGE')
      if (typeof body === 'string') {
        if (Buffer.byteLength(body) > 4096) fail(413, 'BODY_TOO_LARGE')
        try { body = JSON.parse(body) } catch { fail(400, 'INVALID_BODY') }
      }
      const result = await execute({ method: req.method, query: req.query, body })
      return res.status(200).json(result)
    } catch (error) {
      const status = error instanceof PenaltyError ? error.status : 503
      if (status === 405) res.setHeader('Allow', 'GET, POST')
      if (status === 429) res.setHeader('Retry-After', '1')
      return res.status(status).json({ error: error instanceof PenaltyError ? error.code : 'LEADERBOARD_UNAVAILABLE', ...(status === 503 ? { configured: false } : {}) })
    }
  }
}
