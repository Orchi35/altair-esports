import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { calculateShot, powerFromMeter, PANENKA_LIMIT, MAX_ROUND_POINTS } from '../../src/pages/penalty/shotModel.js'
import { normalizePlayerId, playerRankingKey } from '../../src/pages/penalty/playerId.js'
import { isIP } from 'node:net'
import { SHOT_WARMUP_MS, SHOT_WINDOW_MS, timedShotSample } from '../../src/pages/penalty/shotTiming.js'

export const SHOT_COUNT = 10
export const SHOT_INTERVAL_MS = 2000
const SESSION_MS = 30 * 60 * 1000
const PREFIX = 'altair:penalty:v1:'
const PROTOCOL = 4

export const RATE_SCRIPT = `-- penalty-rate
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count`

// Stop at the first rejected bucket: blocked callers must not drain later,
// shared quotas. One transaction preserves the previous admission ordering.
export const RATE_LIMITS_SCRIPT = `-- penalty-ordered-rates
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('EXPIRE', key, ARGV[i * 2]) end
  if count < 1 then return -1 end
  if count > tonumber(ARGV[i * 2 - 1]) then return i end
end
return 0`

export const START_SCRIPT = `-- penalty-start
if not redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[3]) then return 0 end
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
return 1`

// Name ownership is permanent and independent of leaderboard pruning/week expiry.
// A concurrent claimant cannot replace an existing owner. Legacy names stay reserved.
export const CLAIM_PLAYER_SCRIPT = `-- penalty-claim-player
local owner = redis.call('GET', KEYS[1])
if owner then
  if owner == ARGV[1] then return 1 end
  return 0
end
if ARGV[2] == '1' then return 0 end
redis.call('SET', KEYS[1], ARGV[1])
return 1`

// Redis performs compare-and-swap so parallel requests cannot branch a session.
export const ADVANCE_SCRIPT = `-- penalty-advance
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if redis.call('GET', KEYS[2]) ~= ARGV[4] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`

// Claim and both rankings are written together; a lost HTTP response cannot double-submit.
export const SUBMIT_SCRIPT = `-- penalty-submit
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if redis.call('GET', KEYS[5]) ~= ARGV[7] then return 0 end
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
  constructor(status, code, retryAfter) { super(code); this.status = status; this.code = code; this.retryAfter = retryAfter }
}
const fail = (status, code) => { throw new PenaltyError(status, code) }
const unit = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

export function rateAddress(address) {
  if (typeof address !== 'string') return 'unknown'
  if (isIP(address) === 4) return address
  if (isIP(address) === 6) {
    // Canonicalize spelling and group IPv6 privacy addresses by /64 so
    // rotating the interface identifier cannot reset a rate-limit bucket.
    const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1)
    const [left, right = ''] = canonical.split('::')
    const first = left ? left.split(':') : []
    const last = right ? right.split(':') : []
    const parts = canonical.includes('::') ? [...first, ...Array(8-first.length-last.length).fill('0'), ...last] : first
    if (parts.slice(0, 5).every(part => part === '0') && parts[5] === 'ffff') {
      return [parseInt(parts[6],16)>>8,parseInt(parts[6],16)&255,parseInt(parts[7],16)>>8,parseInt(parts[7],16)&255].join('.')
    }
    return `${parts.slice(0,4).join(':')}::/64`
  }
  return 'unknown'
}

function readEntry(member) {
  try {
    const value = JSON.parse(member)
    const playerId = normalizePlayerId(value?.playerId ?? value?.name,{minLength:2})
    if (!playerId || !Number.isInteger(value.score) || value.score < 0 || value.score > MAX_ROUND_POINTS) return null
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

export function shotEntropy(id, shot, secret) {
  const random = createHmac('sha256', secret).update(`${id}:${shot}`).digest()
  const keeperX = 0.12 + (random.readUInt32BE(0) / 0xffffffff) * 0.76
  const keeperY = 0.15 + (random.readUInt32BE(4) / 0xffffffff) * 0.7
  const saveRoll = random.readUInt32BE(8) / 0x100000000
  return { keeperX, keeperY, saveRoll }
}

export function resolveShot({ id, shot, x, y, power, keeperRead=null, shotType='normal' }, secret) {
  if (![x, y, power].every(unit)) fail(400, 'INVALID_SHOT')
  return calculateShot({ x, y, power, ...shotEntropy(id, shot, secret), keeperRead, shotType })
}

export function createPenaltyService({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now, randomId = randomUUID, command: injectedCommand } = {}) {
  async function limits(buckets) {
    const rejected = await command(['EVAL', RATE_LIMITS_SCRIPT, buckets.length,
      ...buckets.map(([key]) => `${PREFIX}rate:${key}`),
      ...buckets.flatMap(([, maximum, seconds]) => [maximum, seconds])])
    if (!Number.isInteger(rejected) || rejected < 0 || rejected > buckets.length) fail(503, 'LEADERBOARD_UNAVAILABLE')
    if (rejected !== 0) throw new PenaltyError(429, 'RATE_LIMITED', buckets[rejected - 1][2])
  }
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
    if (!state || typeof state.id !== 'string' || !Number.isInteger(state.shot) || state.shot < 0 || state.shot > SHOT_COUNT || !Number.isInteger(state.total) || state.total < 0 || state.total > MAX_ROUND_POINTS || !Number.isFinite(state.exp) || !Number.isFinite(state.nextAt)) fail(400, 'INVALID_SESSION')
    if (state.exp <= now()) fail(410, 'SESSION_EXPIRED')
    if (state.v !== PROTOCOL) fail(409, 'SESSION_UPGRADE_REQUIRED')
    if (!Number.isInteger(state.panenkasUsed) || state.panenkasUsed < 0 || state.panenkasUsed > Math.min(state.shot, PANENKA_LIMIT) || state.total > 150 * state.shot + 150 * state.panenkasUsed) fail(400, 'INVALID_SESSION')
    if (!Number.isFinite(state.startedAt) || state.startedAt > state.exp || state.exp - state.startedAt !== SESSION_MS || !Number.isInteger(state.perfectShots) || state.perfectShots < 0 || state.perfectShots > state.shot || !Number.isInteger(state.repeatedSamples) || state.repeatedSamples < 0 || state.repeatedSamples > Math.max(0, state.shot - 1) || (state.shot === 0 ? state.lastMeterPosition !== null : !unit(state.lastMeterPosition))) fail(400, 'INVALID_SESSION')
    if (!normalizePlayerId(state.playerId) || state.playerKey !== playerRankingKey(state.playerId) || !/^[a-f0-9]{64}$/.test(state.ownerDigest)) fail(400, 'INVALID_SESSION')
    if (state.keeperRead != null && (!/^(left|center|right)-(high|low)$/.test(state.keeperRead.zone) || !Number.isInteger(state.keeperRead.streak) || state.keeperRead.streak < 1 || state.keeperRead.streak > state.shot)) fail(400, 'INVALID_SESSION')
    return state
  }
  return async function execute({ method = 'GET', query = {}, body = {}, clientAddress = 'unknown' } = {}) {
    const requestAt = now()
    if (!['GET', 'POST'].includes(method)) fail(405, 'METHOD_NOT_ALLOWED')
    const { secret } = configuration()
    // HMAC avoids persisting raw IP addresses. Missing addresses share a limit,
    // never an unlimited bucket. Handler only supplies platform/socket addresses.
    const addressKey = createHmac('sha256', secret).update(rateAddress(clientAddress)).digest('hex')
    await limits([
      [`ip:${addressKey}:${method}`, method === 'GET' ? 120 : 180, 60],
      [`global:${method}`, method === 'GET' ? 3000 : 6000, 60],
    ])
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
    if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.isBuffer(body)) fail(400, 'INVALID_BODY')
    if (body.action === 'start') {
      if (Object.keys(body).some(key => !['action', 'playerId', 'ownerToken', 'timingMode'].includes(key))) fail(400, 'INVALID_BODY')
      if (body.timingMode !== undefined && body.timingMode !== 'instant') fail(400, 'INVALID_TIMING_MODE')
      const playerId = normalizePlayerId(body.playerId)
      if (!playerId) fail(400, 'INVALID_PLAYER_ID')
      if (typeof body.ownerToken !== 'string' || !/^[a-f0-9]{64}$/.test(body.ownerToken)) fail(400, 'IDENTITY_REQUIRED')
      const playerKey = playerRankingKey(playerId)
      const ownerDigest = createHash('sha256').update(body.ownerToken).digest('hex')
      await limits([
        [`start-ip:${addressKey}`, 12, 60],
        [`start-hour:${addressKey}`, 120, 3600],
        [`start-owner:${ownerDigest}`, 6, 60],
        [`start-owner-hour:${ownerDigest}`, 60, 3600],
        ['start-global', 60, 60],
        ['start-global-hour', 1000, 3600],
      ])
      const boards = await Promise.all([`${PREFIX}all`, weekKey(now())].map(key => command(['ZREVRANGE', key, 0, 999])))
      if (boards.some(members => !Array.isArray(members))) fail(503, 'LEADERBOARD_UNAVAILABLE')
      const legacyOccupied = boards.some(members => members.some(member => playerRankingKey(readEntry(member)?.playerId) === playerKey))
      const claimed = await command(['EVAL', CLAIM_PLAYER_SCRIPT, 1, `${PREFIX}owner:${playerKey}`, ownerDigest, legacyOccupied ? '1' : '0'])
      if (claimed !== 1) fail(409, 'PLAYER_ID_TAKEN')
      const timestamp = now()
      const state = { v: PROTOCOL, id: randomId(), playerId, playerKey, ownerDigest, shot: 0, total: 0, exp: timestamp + SESSION_MS, nextAt: timestamp, timing: null, startedAt: timestamp, perfectShots: 0, panenkasUsed: 0, repeatedSamples: 0, lastMeterPosition: null }
      if (body.timingMode === 'instant') state.timingMode = 'instant'
      const token = sign(state, secret)
      const stored = await command(['EVAL', START_SCRIPT, 2, `${PREFIX}session:${state.id}`, `${PREFIX}active:${ownerDigest}`, token, state.id, SESSION_MS / 1000])
      if (stored !== 1) fail(503, 'LEADERBOARD_UNAVAILABLE')
      return { token, ...(state.timingMode === 'instant' ? { timingMode: 'instant', shots: Array.from({ length: SHOT_COUNT }, (_, index) => shotEntropy(state.id, index + 1, secret)) } : {}), requestReceivedAt: requestAt, serverNow: now() }
    }
    if (!['arm', 'shot', 'submit'].includes(body.action)) fail(400, 'INVALID_ACTION')
    const state = verify(body.token, secret)
    if (typeof body.ownerToken !== 'string' || !/^[a-f0-9]{64}$/.test(body.ownerToken)) fail(400, 'IDENTITY_REQUIRED')
    const ownerDigest = createHash('sha256').update(body.ownerToken).digest()
    if (!timingSafeEqual(ownerDigest, Buffer.from(state.ownerDigest, 'hex'))) fail(403, 'OWNER_MISMATCH')
    const allowed = body.action === 'shot'
      ? (state.timingMode === 'instant' ? ['action', 'token', 'ownerToken', 'x', 'y', 'meterPosition', 'shotType'] : ['action', 'token', 'ownerToken', 'x', 'y', 'shotType'])
      : body.action === 'arm' ? ['action', 'token', 'ownerToken'] : ['action', 'token', 'ownerToken', 'playerId']
    if (Object.keys(body).some(key => !allowed.includes(key))) fail(400, body.action === 'shot' ? 'CLIENT_SHOT_OVERRIDE' : 'INVALID_BODY')
    await limits([[`owner-write:${state.ownerDigest}`, 120, 60]])
    const sessionKey = `${PREFIX}session:${state.id}`
    const activeKey = `${PREFIX}active:${state.ownerDigest}`
    async function advance(next) {
      const token = sign(next, secret)
      const advanced = await command(['EVAL', ADVANCE_SCRIPT, 2, sessionKey, activeKey, body.token, token, Math.max(1, Math.ceil((state.exp - now()) / 1000)), state.id])
      if (advanced !== 1) fail(409, 'SESSION_ALREADY_USED')
      return token
    }
    if (body.action === 'arm') {
      if (state.timingMode === 'instant') fail(409, 'INSTANT_MODE')
      if (state.shot >= SHOT_COUNT) fail(409, 'GAME_FINISHED')
      if (state.timing) fail(409, 'SHOT_ALREADY_ARMED')
      // Per-shot pacing comes from the server, not from a caller's clock.
      const legMs = 580 + createHmac('sha256', secret).update(`meter:${state.id}:${state.shot}`).digest().readUInt16BE(0) % 81
      const startsAt = Math.max(now(), state.nextAt) + SHOT_WARMUP_MS
      const timing = { startsAt, expiresAt: startsAt + SHOT_WINDOW_MS, legMs }
      const token = await advance({ ...state, timing })
      return { token, timing, requestReceivedAt: requestAt, serverNow: now() }
    }
    if (body.action === 'shot') {
      if (state.shot >= SHOT_COUNT) fail(409, 'GAME_FINISHED')
      const shotType = body.shotType === undefined ? 'normal' : body.shotType
      if (!['normal', 'panenka'].includes(shotType)) fail(400, 'INVALID_SHOT')
      if (shotType === 'panenka' && state.panenkasUsed >= PANENKA_LIMIT) fail(409, 'PANENKA_LIMIT_REACHED')
      if (![body.x, body.y].every(unit)) fail(400, 'INVALID_SHOT')
      const instant = state.timingMode === 'instant'
      if (instant && !unit(body.meterPosition)) fail(400, 'INVALID_SHOT')
      if (!instant && now() < state.nextAt) fail(429, 'SHOT_TOO_SOON')
      if (!instant && !state.timing) fail(409, 'SHOT_NOT_ARMED')
      const receivedAt = requestAt
      if (!instant && receivedAt < state.timing.startsAt) fail(429, 'SHOT_NOT_READY')
      if (!instant && receivedAt >= state.timing.expiresAt) fail(410, 'SHOT_EXPIRED')
      const timingSample = instant ? { meterPosition: body.meterPosition } : timedShotSample(receivedAt, state.timing)
      const sample = { ...timingSample, power: powerFromMeter(timingSample.meterPosition, shotType) }
      const result = { ...resolveShot({ id: state.id, shot: state.shot + 1, x: body.x, y: body.y, power:sample.power, keeperRead:state.keeperRead, shotType }, secret), ...sample }
      const next = { ...state, timing: null, keeperRead:result.keeperRead, shot: state.shot + 1, panenkasUsed: state.panenkasUsed + Number(shotType === 'panenka'), total: state.total + result.points, nextAt: receivedAt + SHOT_INTERVAL_MS, perfectShots: state.perfectShots + Number(result.perfect), repeatedSamples: state.repeatedSamples + Number(state.lastMeterPosition === sample.meterPosition), lastMeterPosition: sample.meterPosition }
      const token = await advance(next)
      return { token, result, total: next.total, shot: next.shot, panenkasUsed: next.panenkasUsed, finished: next.shot === SHOT_COUNT, requestReceivedAt: requestAt, serverNow: now() }
    }
    if (state.shot !== SHOT_COUNT) fail(409, 'GAME_NOT_FINISHED')
    const playerId = normalizePlayerId(body.playerId)
    if (!playerId) fail(400, 'INVALID_PLAYER_ID')
    const playerKey = playerRankingKey(playerId)
    if (!state.playerKey || !normalizePlayerId(state.playerId)) fail(409, 'IDENTITY_REQUIRED')
    if (playerKey !== state.playerKey) fail(409, 'PLAYER_ID_MISMATCH')
    const boardKeys = [`${PREFIX}all`, weekKey(now())]
    // Resolve historical Unicode/case variants in JS. The Lua transaction also
    // matches playerKey, including submissions arriving after these reads.
    const legacyMatches = await Promise.all(boardKeys.map(async key => {
      const members = await command(['ZREVRANGE', key, 0, 999])
      if (!Array.isArray(members)) fail(503, 'LEADERBOARD_UNAVAILABLE')
      return members.filter(member => playerRankingKey(readEntry(member)?.playerId) === playerKey)
    }))
    const entry = JSON.stringify({ id: state.id, playerId, playerKey, score: state.total, protocol: PROTOCOL, timingMode: state.timingMode || 'server', completedAt: now(), review: { durationMs: Math.max(0, Math.min(SESSION_MS, now() - state.startedAt)), perfectShots: state.perfectShots, repeatedSamples: state.repeatedSamples } })
    const saved = await command(['EVAL', SUBMIT_SCRIPT, 5, sessionKey, `${PREFIX}submitted:${state.id}`, ...boardKeys, activeKey, body.token, state.total, entry, SESSION_MS / 1000, playerKey, JSON.stringify(legacyMatches), state.id])
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
      if (Buffer.isBuffer(body)) {
        if (body.length > 4096) fail(413, 'BODY_TOO_LARGE')
        body = body.toString('utf8')
      }
      if (body && typeof body === 'object' && Buffer.byteLength(JSON.stringify(body)) > 4096) fail(413, 'BODY_TOO_LARGE')
      if (typeof body === 'string') {
        if (Buffer.byteLength(body) > 4096) fail(413, 'BODY_TOO_LARGE')
        try { body = JSON.parse(body) } catch { fail(400, 'INVALID_BODY') }
      }
      if (req.method === 'POST' && (!body || typeof body !== 'object' || Array.isArray(body))) fail(400, 'INVALID_BODY')
      if (req.method === 'POST' && !/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] || '')) fail(415, 'JSON_REQUIRED')
      if (req.method === 'POST' && ['same-site', 'cross-site'].includes(req.headers?.['sec-fetch-site'])) fail(403, 'CROSS_SITE_REQUEST')
      const environment = options.env || process.env
      if (req.method === 'POST' && req.headers?.origin !== undefined) {
        const host = req.headers?.host
        const forwardedProto = environment.VERCEL === '1' ? req.headers?.['x-forwarded-proto'] : undefined
        const protocol = forwardedProto === 'https' || forwardedProto === 'http' ? forwardedProto : req.socket?.encrypted ? 'https' : 'http'
        let origin
        try { origin = new URL(req.headers.origin) } catch { fail(403, 'CROSS_SITE_REQUEST') }
        if (typeof host !== 'string' || origin.origin !== `${protocol}://${host}`) fail(403, 'CROSS_SITE_REQUEST')
      }
      const forwarded = environment.VERCEL === '1' ? req.headers?.['x-vercel-forwarded-for'] : null
      const address = typeof forwarded === 'string' && isIP(forwarded.trim()) ? forwarded.trim() : req.socket?.remoteAddress
      const result = await execute({ method: req.method, query: req.query, body, clientAddress: address || 'unknown' })
      return res.status(200).json(result)
    } catch (error) {
      const status = error instanceof PenaltyError ? error.status : 503
      if (status === 405) res.setHeader('Allow', 'GET, POST')
      if (status === 429) res.setHeader('Retry-After', String(error.retryAfter || 1))
      return res.status(status).json({ error: error instanceof PenaltyError ? error.code : 'LEADERBOARD_UNAVAILABLE', ...(status === 503 ? { configured: false } : {}) })
    }
  }
}
