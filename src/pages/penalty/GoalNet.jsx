import {memo} from 'react';
import {NET_SETTLE_MS} from './netMotion.js';
import {sampleNetPaths} from './netMesh.js';
// Perspective-mapped side and roof strands share the front/back attachment points.
// Static geometry is built once; only the rear mesh deforms on impact.
const mix=(a,b,t)=>a+(b-a)*t;
const line=(x,y,u,v)=>`M${x} ${y}L${u} ${v}`;
const roof=[],sides=[],floor=[];
for(let i=0;i<=36;i++){
 const t=i/36;
 roof.push(line(mix(220,780,t),145,mix(250,750,t),180));
 floor.push(line(mix(220,780,t),380,mix(250,750,t),357));
}
for(let i=0;i<=14;i++){
 const t=i/14;
 sides.push(line(220,mix(145,380,t),250,mix(180,357,t)),line(780,mix(145,380,t),750,mix(180,357,t)));
}
for(let i=1;i<=4;i++){
 const t=i/4,l=mix(220,250,t),r=mix(780,750,t),top=mix(145,180,t),bottom=mix(380,357,t);
 roof.push(line(l,top,r,top));sides.push(line(l,top,l,bottom),line(r,top,r,bottom));floor.push(line(l,bottom,r,bottom));
}
function NetCage(){return <>
 <defs>
  <linearGradient id="pen-net-light" x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#f1faff" stopOpacity=".78"/><stop offset=".45" stopColor="#cae3ee" stopOpacity=".56"/><stop offset="1" stopColor="#8daebc" stopOpacity=".4"/></linearGradient>
  <linearGradient id="pen-net-depth" x2="0" y2="1"><stop stopColor="#071323" stopOpacity=".28"/><stop offset="1" stopColor="#071923" stopOpacity=".08"/></linearGradient>
 </defs>
 <path d="M220 145H780L750 180H250Z M220 145L250 180V357L220 380Z M780 145L750 180V357L780 380Z" fill="url(#pen-net-depth)"/>
 <path d="M220 380L250 357H750L780 380Z" fill="#061d22" fillOpacity=".22"/>
 <path d={floor.join(' ')} fill="none" stroke="#bfd6d6" strokeWidth=".7" opacity=".22"/>
 <path d={roof.join(' ')} fill="none" stroke="#d6e8ee" strokeWidth=".95" opacity=".65"/>
 <path d={sides.join(' ')} fill="none" stroke="#c5dde8" strokeWidth=".85" opacity=".57"/>
 <path d="M250 180H750V357H250Z M220 145L250 180M780 145L750 180M220 380L250 357M780 380L750 357" fill="none" stroke="#d5e4e9" strokeWidth="1.8" strokeOpacity=".68"/>
 <path d="M250 357H750" fill="none" stroke="#06131b" strokeWidth="4" opacity=".45"/>
 {Array.from({length:19},(_,i)=><path key={i} d={`M${228+i*30} 143v7l2 2`} stroke="#708d9a" strokeWidth="1.4" fill="none"/>)}
 </>;}
const StaticNetCage=memo(NetCage);
function GoalNet({result,age=0}){
 const moving=result?.goal&&age>0&&age<NET_SETTLE_MS;
 const mesh=sampleNetPaths(result,age).join(' ');
 return <g className="pen-goal-net" data-reacting={moving?'true':'false'} aria-hidden="true">
  <path d="M250 180H750V357H250Z" fill="#071724" fillOpacity=".22"/>
  <g className="pen-net-mesh" fill="none" strokeLinejoin="round">
   <path d={mesh} stroke="#04121d" strokeOpacity=".36" strokeWidth="2.1"/>
   <path d={mesh} stroke="url(#pen-net-light)" strokeWidth=".95"/>
  </g>
  <StaticNetCage/>
 </g>;
}
export default memo(GoalNet);
