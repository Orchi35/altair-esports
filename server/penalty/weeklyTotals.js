import { normalizePlayerId, playerRankingKey } from '../../src/pages/penalty/playerId.js'
import { MAX_ROUND_POINTS } from '../../src/pages/penalty/shotModel.js'

const PREFIX = 'altair:penalty:v1:'
export const TOTALS_KEY = `${PREFIX}weekly-totals:v2`
export const TOTAL_NAMES_KEY = `${PREFIX}weekly-total-names:v2`
export const TOTAL_MIGRATION_KEY = `${PREFIX}weekly-totals-migrated:v2`
export const contributionKey = week => `${PREFIX}weekly-contribution:v2:${week.slice(-10)}`

// Reused inside submission and migration transactions. A weekly improvement adds
// only its delta. Durable contributions survive expiry/pruning of public boards.
export const ADD_WEEKLY_CONTRIBUTION_LUA = `
local function contribute(week, totals, names, playerKey, playerId, score)
  local previous = redis.call('HGET', week, playerKey)
  local oldScore = tonumber(previous) or 0
  if not previous or score > oldScore then
    redis.call('HSET', week, playerKey, score)
    redis.call('ZINCRBY', totals, score - oldScore, playerKey)
    redis.call('HSET', names, playerKey, playerId)
  end
end
`

export const IMPORT_WEEK_SCRIPT = `-- penalty-import-week
${ADD_WEEKLY_CONTRIBUTION_LUA}
local entries = cjson.decode(ARGV[1])
for _, entry in ipairs(entries) do
  contribute(KEYS[1], KEYS[2], KEYS[3], entry.playerKey, entry.playerId, entry.score)
end
return 1`

// Only weekly evidence is imported: an old all-time personal best does not tell
// us which week's contribution it represents. Expired history is not fabricated.
export async function migrateWeeklyTotals(command) {
  if (await command(['GET', TOTAL_MIGRATION_KEY]) === '1') return
  let cursor = '0'
  do {
    const scan = await command(['SCAN', cursor, 'MATCH', `${PREFIX}week:*`, 'COUNT', 100])
    if (!Array.isArray(scan) || !Array.isArray(scan[1])) throw new Error('Invalid weekly scan')
    cursor = String(scan[0])
    for (const week of scan[1]) {
      if (!/^altair:penalty:v1:week:\d{4}-\d{2}-\d{2}$/.test(week)) continue
      const members = await command(['ZREVRANGE', week, 0, -1])
      if (!Array.isArray(members)) throw new Error('Invalid weekly board')
      const entries = new Map()
      for (const member of members) {
        let row
        try { row = JSON.parse(member) } catch { continue }
        const playerId = normalizePlayerId(row?.playerId ?? row?.name, {minLength:2})
        if (!playerId || !Number.isInteger(row.score) || row.score < 0 || row.score > MAX_ROUND_POINTS) continue
        const playerKey = playerRankingKey(playerId)
        if (!entries.has(playerKey) || row.score > entries.get(playerKey).score) entries.set(playerKey, {playerKey, playerId, score:row.score})
      }
      const result = await command(['EVAL', IMPORT_WEEK_SCRIPT, 3, contributionKey(week), TOTALS_KEY, TOTAL_NAMES_KEY, JSON.stringify([...entries.values()])])
      if (result !== 1) throw new Error('Weekly import failed')
    }
  } while (cursor !== '0')
  // Imports are idempotent, including concurrent cold starts and interrupted runs.
  if (await command(['SET', TOTAL_MIGRATION_KEY, '1']) !== 'OK') throw new Error('Migration marker failed')
}

export async function readWeeklyTotals(command) {
  const rows = await command(['ZREVRANGE', TOTALS_KEY, 0, 49, 'WITHSCORES'])
  if (!Array.isArray(rows) || rows.length % 2) throw new Error('Invalid total board')
  if (!rows.length) return []
  const keys = rows.filter((_, index) => index % 2 === 0)
  const names = await command(['HMGET', TOTAL_NAMES_KEY, ...keys])
  if (!Array.isArray(names) || names.length !== keys.length) throw new Error('Invalid total names')
  return keys.map((key, index) => {
    const playerId = normalizePlayerId(names[index], {minLength:2})
    const score = Number(rows[index * 2 + 1])
    if (!playerId || playerRankingKey(playerId) !== key || !Number.isSafeInteger(score) || score < 0) throw new Error('Invalid total entry')
    return {playerId, score}
  })
}
