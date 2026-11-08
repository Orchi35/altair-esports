import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHeroState } from '../src/features/hero/heroState.js';
import { SITE_LINKS } from '../src/config/site.js';
test('VPG upcoming countdown switches to broadcast destination at kickoff without claiming live', () => {
  const kickoff = Date.parse('2026-11-09T21:15:00Z');
  const matchCenter = { meta:{status:'fresh'}, nextMatch:{status:'scheduled',startsAt:new Date(kickoff).toISOString(),broadcastOnKickoff:true} };
  assert.equal(resolveHeroState({matchCenter,nowMs:kickoff-2*86400000}).kind,'countdown');
  const started = resolveHeroState({matchCenter,nowMs:kickoff});
  assert.equal(started.kind,'broadcast');
  assert.equal(started.primary.href,SITE_LINKS.twitch);
  assert.equal(started.primary.external,true);
});
