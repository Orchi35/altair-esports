import {memo,useId} from 'react';
import {arenaSponsors} from './arenaSponsors.js';

const TILE=240;

function AdvertisingBoard({sponsors=arenaSponsors}){
 const uid=useId().replaceAll(':','');
 if(!sponsors.length)return null;
 // Keep the repeat boundary in sponsor order for any number of configured brands.
 const repeats=Math.ceil(4/sponsors.length);
 const cycle=Array.from({length:repeats},()=>sponsors).flat();
 const travel=cycle.length*TILE;
 const clip=`${uid}-screen`,dots=`${uid}-dots`,shine=`${uid}-shine`;
 return <g className="pen-ad-board" transform="translate(0 301)" role="img" aria-label={sponsors.map(s=>s.label).join(' · ')} pointerEvents="none">
  <defs>
   <clipPath id={clip}><rect x="0" y="0" width="1000" height="43" rx="2"/></clipPath>
   <pattern id={dots} width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".55" fill="#010d19" opacity=".55"/></pattern>
   <linearGradient id={shine}><stop stopColor="#c9ebff" stopOpacity="0"/><stop offset=".5" stopColor="#c9ebff" stopOpacity=".16"/><stop offset="1" stopColor="#c9ebff" stopOpacity="0"/></linearGradient>
  </defs>
  <path d="M0-4H1000V0H0Z" fill="#69869a" opacity=".8"/>
  <rect y="43" width="1000" height="5" fill="#050e17"/>
  <path d="M0 49H1000" stroke="#86bee0" strokeWidth="2" opacity=".15"/>
  <g clipPath={`url(#${clip})`}>
   <rect width="1000" height="43" fill="#102e49"/>
   <g className="pen-ad-ticker" style={{'--board-travel':`${-travel}px`,'--board-duration':`${travel/22}s`}}>
    {[...cycle,...cycle,cycle[0]].map((s,i)=><g key={`${i}-${s.id}`} transform={`translate(${i*TILE} 0)`}>
     <rect width={TILE} height="43" fill={s.background||'#102e49'}/>
     <path d="M8 34L27 9M18 34L37 9" stroke={s.foreground||'#c9e8ff'} strokeWidth="2" opacity=".22"/>
     {s.logoSrc?<image href={s.logoSrc} x="48" y="7" width="164" height="29" preserveAspectRatio="xMidYMid meet"/>:<text x="130" y="29" textAnchor="middle" fill={s.foreground||'#c9e8ff'} fontFamily="Barlow,Arial,sans-serif" fontSize="25" fontWeight="700" letterSpacing="6" textLength={s.label.length>14?170:undefined} lengthAdjust="spacingAndGlyphs">{s.label}</text>}
     <path d="M232 11V32" stroke="#c7e8ff" opacity=".18"/>
    </g>)}
   </g>
   <rect width="1000" height="43" fill={`url(#${dots})`}/>
   <rect className="pen-ad-sheen" x="-240" width="220" height="43" fill={`url(#${shine})`}/>
  </g>
  <path d="M0 .5H1000M0 42.5H1000" stroke="#a5d2ef" opacity=".28"/>
 </g>;
}

export default memo(AdvertisingBoard);
