import {memo} from 'react';
import {NET_SETTLE_MS} from './netMotion.js';
import {sampleNetPaths} from './netMesh.js';
function GoalNet({result,age=0}){
 const moving=result?.goal&&age>0&&age<NET_SETTLE_MS;
 return <g className="pen-goal-net" data-reacting={moving?'true':'false'} aria-hidden="true">
  <path d="M250 180H750V357H250Z" fill="#082024" fillOpacity=".14"/>
  <g className="pen-net-mesh" fill="none" stroke="#ecf5f5" strokeOpacity=".52" strokeWidth=".8">
   {sampleNetPaths(result,age).map((d,i)=><path key={i} d={d}/>)}
  </g>
  <path d="M220 145H780L750 180H250Z" fill="url(#pen-side-net)"/>
  <path d="M220 145L250 180V357L220 380ZM780 145L750 180V357L780 380Z" fill="url(#pen-side-net)"/>
  <path d="M250 180H750V357H250Z M220 145L250 180M780 145L750 180M220 380L250 357M780 380L750 357" fill="none" stroke="#c2d1d0" strokeWidth="1.4" strokeOpacity=".6"/>
 </g>;
}
export default memo(GoalNet);
