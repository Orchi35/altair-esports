import {netContact} from './netMotion.js';
import {KEEPER_CONTACT} from './keeperMotion.js';
const lerp = (a, b, t) => a + (b - a) * t;
const screen = (x, y) => ({ x: 220 + x * 560, y: 145 + y * 235 });
export const FLIGHT_MS = 1150;
export const POST_CONTACT = .68;

// Damped displacement starts exactly on contact and ends before the result screen.
export function samplePostImpact(result,progress) {
  if(result?.outcome!=='post'||progress<=POST_CONTACT||progress>=1)return {offset:0,flash:0};
  const t=(progress-POST_CONTACT)/(1-POST_CONTACT);
  return {offset:Math.sin(t*Math.PI*8)*2.8*(1-t)**2,flash:Math.max(0,1-t*2.5)};
}

// The contact and rebound share the same point: saves never pass through the keeper.
export function sampleFlight(result, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const start = { x: 500, y: 562 };
  const end = result.goal ? netContact(result) : screen(result.targetX, result.targetY);
  const contact = screen(result.impactX, result.impactY);
  const rebound = result.outcome === 'saved' || result.outcome === 'post';
  const impactAt = result.outcome === 'post' ? POST_CONTACT : rebound ? KEEPER_CONTACT : 1;
  const first = p <= impactAt;
  const t = first ? p / impactAt : (p - impactAt) / (1 - impactAt);
  const from = first ? start : contact;
  const to = first && rebound ? contact : end;
  const lift = result.outcome === 'weak' ? 12 : first ? 75 : result.outcome === 'post' ? 12 : 35;
  const x = lerp(from.x, to.x, t);
  const y = lerp(from.y, to.y, t) - Math.sin(t * Math.PI) * lift;
  const scale = rebound && !first ? lerp(.46, result.outcome === 'post' ? .76 : .62, t) : lerp(1, .46, t);
  const spin=result.perfect ? 900 : 540;
  const rotation=result.outcome==='post'&&!first?impactAt*spin-(p-impactAt)*spin*.8:p*spin;
  return { x, y, scale, rotation };
}
