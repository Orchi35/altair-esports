import {memo} from 'react';
import AdvertisingBoard from './AdvertisingBoard.jsx';
const ASSETS='/games/penalty/';
const PARTICLES=Array.from({length:38},(_,i)=>({x:i%2?825+(i*19)%150:20+(i*29)%150,y:85+(i*23)%185,color:['#d9efff','#78b8e6','#f5f3df'][i%3],delay:-(i*.31),duration:3.4+(i%5)*.43,drift:(i%2?-1:1)*(18+i%27)}));
const CROWD_PATCHES=[{x:5,y:217,w:195,h:74},{x:800,y:214,w:195,h:78},{x:10,y:140,w:180,h:50},{x:810,y:140,w:180,h:50}];


// Decorative layers stay mounted and do not reconcile with ball/keeper frames.
function StadiumBackdrop(){
 return <>
 <defs>
  <linearGradient id="pen-scene-tone" x2="0" y2="1"><stop stopColor="#07182e" stopOpacity=".12"/><stop offset=".55" stopColor="#102134" stopOpacity=".08"/><stop offset="1" stopColor="#020e16" stopOpacity=".35"/></linearGradient>
  <radialGradient id="pen-shadow"><stop stopColor="#010b10" stopOpacity=".65"/><stop offset="1" stopColor="#010b10" stopOpacity="0"/></radialGradient>
  <radialGradient id="pen-light"><stop stopColor="#d9f3ff" stopOpacity=".16"/><stop offset="1" stopColor="#76beff" stopOpacity="0"/></radialGradient>
  <filter id="pen-post-shadow" x="-20%" width="140%"><feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#04131c" floodOpacity=".6"/></filter>
  <filter id="pen-keeper-shadow" x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="1" dy="2" stdDeviation="1.3" floodColor="#021316" floodOpacity=".45"/></filter>
  {CROWD_PATCHES.map((r,i)=><clipPath key={i} id={`pen-crowd-patch-${i}`}><rect x={r.x} y={r.y} width={r.w} height={r.h} rx="9"/></clipPath>)}
  <clipPath id="pen-flag-left"><path d="M0 119L44 133L66 194L0 187Z"/></clipPath>
  <clipPath id="pen-flag-right"><path d="M1000 117L957 132L936 194L1000 188Z"/></clipPath>
 </defs>
 <image className="pen-stadium-plate" href={`${ASSETS}stadium-v1.webp`} width="1000" height="650" preserveAspectRatio="none"/>
 {CROWD_PATCHES.map((r,i)=><g key={i} clipPath={`url(#pen-crowd-patch-${i})`}><g className="pen-crowd-motion" style={{animationDelay:`${-i*.48}s`,transformOrigin:`${r.x+r.w/2}px ${r.y+r.h}px`}}><image href={`${ASSETS}stadium-v1.webp`} width="1000" height="650" preserveAspectRatio="none"/></g></g>)}
 {['left','right'].map((side,i)=><g key={side} clipPath={`url(#pen-flag-${side})`}><g className="pen-flag-wave" style={{animationDelay:`${-i*.9}s`,transformOrigin:`${i?980:20}px 190px`}}><image href={`${ASSETS}stadium-v1.webp`} width="1000" height="650" preserveAspectRatio="none"/></g></g>)}
 <rect width="1000" height="650" fill="url(#pen-scene-tone)"/>
 <g className="pen-stadium-haze"><ellipse cx="80" cy="62" rx="195" ry="200" fill="url(#pen-light)"/><ellipse cx="920" cy="62" rx="195" ry="200" fill="url(#pen-light)"/></g>
 <g className="pen-confetti" aria-hidden="true">{PARTICLES.map((a,i)=><g key={i} transform={`translate(${a.x} ${a.y})`}><rect className="pen-confetti-piece" x="0" y="0" width={i%3===0?2:3} height={i%3===0?8:5} rx=".5" fill={a.color} style={{'--drift':`${a.drift}px`,animationDuration:`${a.duration}s`,animationDelay:`${a.delay}s`}}/></g>)}</g>
 <AdvertisingBoard/>
 {/* Chalk follows the ground plane; the penalty spot is underneath the ball. */}
 <g className="pen-pitch-lines" fill="none" stroke="#e6eee0" strokeWidth="2.4" opacity=".8"><path d="M0 381H1000"/><path d="M127 381L46 465H954L873 381"/><path d="M-60 381L-270 704H1270L1060 381"/><path d="M376 650Q500 611 624 650" strokeWidth="2.8"/></g>
 <ellipse cx="500" cy="586" rx="5" ry="2.2" fill="#f6f3e2" opacity=".9"/>
 <path d="M218 382L300 443M782 382L850 443" stroke="#072b22" strokeOpacity=".25" strokeWidth="8"/>
 <ellipse cx="500" cy="382" rx="310" ry="14" fill="url(#pen-shadow)" opacity=".65"/>
 </>;
}
export default memo(StadiumBackdrop);
