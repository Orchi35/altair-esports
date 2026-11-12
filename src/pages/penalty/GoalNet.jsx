import {memo} from 'react';
import {deformNetPoint,NET_SETTLE_MS} from './netMotion.js';

const COLS=36,ROWS=14;
const strands=[
 ...Array.from({length:COLS+1},(_,c)=>Array.from({length:ROWS+1},(_,r)=>[250+c*500/COLS,180+r*177/ROWS])),
 ...Array.from({length:ROWS+1},(_,r)=>Array.from({length:COLS+1},(_,c)=>[250+c*500/COLS,180+r*177/ROWS])),
];
function GoalNet({result,age=0}){
 const moving=result?.goal&&age>0&&age<NET_SETTLE_MS;
 return <g className="pen-goal-net" data-reacting={moving?'true':'false'} aria-hidden="true">
  <path d="M250 180H750V357H250Z" fill="#082024" fillOpacity=".14"/>
  <g className="pen-net-mesh" fill="none" stroke="#ecf5f5" strokeOpacity=".52" strokeWidth=".8">
   {strands.map((line,i)=><path key={i} d={line.map(([x,y],j)=>{const p=deformNetPoint(x,y,result,age);return `${j?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;}).join(' ')}/>)}
  </g>
  <path d="M220 145H780L750 180H250Z" fill="url(#pen-side-net)"/>
  <path d="M220 145L250 180V357L220 380ZM780 145L750 180V357L780 380Z" fill="url(#pen-side-net)"/>
  <path d="M250 180H750V357H250Z M220 145L250 180M780 145L750 180M220 380L250 357M780 380L750 357" fill="none" stroke="#c2d1d0" strokeWidth="1.4" strokeOpacity=".6"/>
 </g>;
}
export default memo(GoalNet);
