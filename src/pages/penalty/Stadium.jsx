import {useEffect,useRef,useState} from 'react';
import {flightDuration,sampleFlight,samplePostImpact} from './flightMotion.js';
import {sampleKeeper,sampleKeeperRecovery,keeperRecoveryDuration,KEEPER_CONTACT} from './keeperMotion.js';
import StadiumBackdrop from './StadiumBackdrop.jsx';
import GoalNet from './GoalNet.jsx';
import AimTarget from './AimTarget.jsx';
import {NET_SETTLE_MS,sampleGoalBall} from './netMotion.js';

const ASSETS='/games/penalty/';

const POSES={ready:{y:0,h:680,w:146},dive:{y:690,h:370,w:200},land:{y:1210,h:210,w:200},crouch:{y:0,h:445,w:136,v2:true},push:{y:445,h:415,w:160,v2:true},kneel:{y:860,h:385,w:136,v2:true},block:{y:1245,h:529,w:146,v2:true}};
function KeeperSprite({col,pose}){
 const frame=POSES[pose],cropWidth=frame.v2?443:512,height=frame.h*frame.w/cropWidth;
 const cropX=frame.v2?(col?431:10):col*512;
 return <svg x={-frame.w/2} y={-height/2} width={frame.w} height={height} viewBox={`${cropX} ${frame.y} ${cropWidth} ${frame.h}`} overflow="hidden" aria-hidden="true"><image href={`${ASSETS}${frame.v2?'keepers-transitions-v2.webp':'keepers-atlas-v1.webp'}`} width={frame.v2?887:1024} height={frame.v2?1774:1536}/></svg>;
}

export default function Stadium(props){
 const {flight,phase,onFlightComplete,onRecoveryComplete}=props;
 const [animation,setAnimation]=useState({key:'',progress:0});
 const animationKey=`${phase}:${flight?.shot||0}`;
 useEffect(()=>{
  if(phase!=='flight'&&phase!=='recover')return;
  let frame,start;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=phase==='flight'?flightDuration(flight?.result):keeperRecoveryDuration(flight?.result || {});
  const tick=time=>{start??=time;const p=reduce?1:Math.min(1,(time-start)/duration);setAnimation({key:animationKey,progress:p});if(p<1)frame=requestAnimationFrame(tick);else if(phase==='flight')onFlightComplete?.();else onRecoveryComplete?.();};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[phase,animationKey,flight,onFlightComplete,onRecoveryComplete]);
 return <><link rel="preload" as="image" href={`${ASSETS}keepers-atlas-v1.webp`}/><link rel="preload" as="image" href={`${ASSETS}keepers-transitions-v2.webp`}/><StadiumScene {...props} progress={animation.key===animationKey?animation.progress:0}/></>;
}

export function StadiumScene({aim,setAim,flight,phase,tr,keeper,shotType='normal',progress=0}){
 const svg=useRef(null),dragPointer=useRef(null);
 function point(e){
  if(phase!=='aim')return;
  const matrix=svg.current.getScreenCTM();if(!matrix)return;
  const position=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
  setAim({x:Math.max(0,Math.min(1,(position.x-220)/560)),y:Math.max(0,Math.min(1,(position.y-145)/235))});
 }
 function beginAim(e){
  if(phase!=='aim'||e.button!==0||!e.isPrimary)return;
  dragPointer.current=e.pointerId;svg.current.setPointerCapture(e.pointerId);point(e);
 }
 function endAim(e){
  if(dragPointer.current!==e.pointerId)return;
  dragPointer.current=null;
  if(svg.current.hasPointerCapture(e.pointerId))svg.current.releasePointerCapture(e.pointerId);
 }
 function keyAim(e){
  if(phase!=='aim')return;
  const delta={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.06],ArrowDown:[0,.06]}[e.key];
  if(!delta)return;e.preventDefault();
  setAim(a=>({x:Math.max(0,Math.min(1,a.x+delta[0])),y:Math.max(0,Math.min(1,a.y+delta[1]))}));
 }
 const kicked=['flight','result','done','recover'].includes(phase),result=flight?.result;
 const p=['result','done','recover'].includes(phase)?1:progress;
 const netHit=Boolean(kicked&&result?.goal&&p>=1);
 const [netClock,setNetClock]=useState({flight:null,age:0});
 useEffect(()=>{
  if(!netHit)return;
  let frame,start;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick=time=>{start??=time;const age=reduced?NET_SETTLE_MS:Math.min(NET_SETTLE_MS,time-start);setNetClock({flight,age});if(age<NET_SETTLE_MS)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[netHit,flight]);
 const netAge=netHit&&netClock.flight===flight?netClock.age:0;
 const ball=netHit?sampleGoalBall(result,netAge):kicked&&result?sampleFlight(result,p):{x:500,y:562,scale:1,rotation:0};
 const motion=kicked&&result?(phase==='recover'?sampleKeeperRecovery(result,progress):sampleKeeper(result,p)):sampleKeeper({},0);
 const col=keeper.id==='927266'?1:0;
 const postImpact=samplePostImpact(result,p);
 const goalHit=netHit;
 const contactX=result?220+result.impactX*560:500,contactY=result?145+result.impactY*235:285;
 return <svg ref={svg} data-shot-type={kicked?result?.shotType:undefined} className={`pen-stadium pen-stadium-real ${goalHit?'has-goal':''}`} viewBox="0 0 1000 650" role="group" tabIndex={phase==='aim'?0:-1} aria-label={tr?'Nişan alanı. Kaleye dokun, sürükle veya yön tuşlarını kullan.':'Aim area. Tap, drag or use arrow keys to choose your target.'} onKeyDown={keyAim} onPointerDown={beginAim} onPointerMove={e=>{if(dragPointer.current===e.pointerId)point(e);}} onPointerUp={endAim} onPointerCancel={endAim} onLostPointerCapture={()=>{dragPointer.current=null;}}>
 <StadiumBackdrop/>
 <GoalNet result={result} age={netAge}/>
 <defs>
  {[['left',216,225],['right',776,785]].map(([id,x1,x2])=><linearGradient key={id} id={`pen-frame-${id}`} gradientUnits="userSpaceOnUse" x1={x1} x2={x2} y1="0" y2="0"><stop stopColor="#829aa6"/><stop offset=".3" stopColor="#f6fcff"/><stop offset=".58" stopColor="#dceaf0"/><stop offset="1" stopColor="#7f99a5"/></linearGradient>)}
  <linearGradient id="pen-frame-crossbar" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="140" y2="150"><stop stopColor="#f7fcff"/><stop offset=".4" stopColor="#e0edf2"/><stop offset="1" stopColor="#7a95a3"/></linearGradient>
 </defs>
 <g className="pen-goal-frame" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#pen-post-shadow)">
  {[['left','M220 380V145'],['crossbar','M220 145H780'],['right','M780 145V380']].map(([side,d])=><g key={side} data-post={side} transform={`translate(${side!=='crossbar'&&result?.postSide===side?postImpact.offset:0} ${side==='crossbar'&&result?.postSide===side?postImpact.offset:0})`}>
   <path d={d} stroke="#193440" strokeWidth="11"/>
   <path d={d} stroke={`url(#pen-frame-${side})`} strokeWidth="9"/>
   <path d={d} stroke="#fff" strokeOpacity=".5" strokeWidth="1" transform="translate(-1 -2)"/>
  </g>)}
 </g>
 <g fill="#d0d9d9">{[220,780].map(x=><rect key={x} x={x-7} y="377" width="14" height="5" rx="2"/>)}</g>
 <ellipse cx={motion.shadowX} cy="382" rx={motion.shadowRx} ry="9" fill="url(#pen-shadow)" opacity={motion.shadowOpacity}/>
 <g className="pen-keeper-real" data-pose={motion.pose} transform={`translate(${motion.x} ${motion.y}) rotate(${motion.angle}) scale(${motion.facing} ${motion.scaleY})`} filter="url(#pen-keeper-shadow)">
  <g className={phase==='aim'?'pen-keeper-ready-breathe':undefined}><KeeperSprite col={col} pose={motion.pose}/></g>
 </g>
 {motion.impact>0&&<g aria-hidden="true" fill="#b9c5a1" opacity={motion.impact*.3}>{[-1,1].map(side=><ellipse key={side} cx={motion.x+side*(24+motion.impact*38)} cy="381" rx={10+motion.impact*22} ry={2+motion.impact*4}/>)}</g>}
 {phase==='aim'&&<AimTarget {...{aim,shotType,tr}}/>}
 <ellipse cx={ball.x} cy={kicked?Math.max(390,586-p*180):586} rx={31*ball.scale} ry={7*ball.scale} fill="url(#pen-shadow)" opacity={kicked?.65:.9}/>
 {phase==='flight'&&result?.shotType==='panenka'&&p>0&&p<1&&<g aria-hidden="true" fill="none" stroke="#f5dfa2" strokeWidth="1.3" strokeLinecap="round" opacity={.55*Math.sin(Math.PI*p)}><circle cx={ball.x} cy={ball.y} r={35*ball.scale} strokeDasharray="1 5"/>{[.06,.12,.18].map(lag=>{const trail=sampleFlight(result,Math.max(0,p-lag));return <circle key={lag} cx={trail.x} cy={trail.y} r={2*trail.scale} fill="#f5dfa2" stroke="none"/>;})}</g>}
 {kicked&&result?.perfect&&<g className="pen-power-trail" fill="#b8ffe2">{[.035,.07,.105,.14].map((lag,i)=>{const trail=sampleFlight(result,Math.max(0,p-lag));return <circle key={lag} cx={trail.x} cy={trail.y} r={(18-i*3)*trail.scale} opacity={(1-p)*(.5-i*.09)}/>;})}<circle cx={ball.x} cy={ball.y} r={34*ball.scale} fill="none" stroke="#a5ffd0" strokeWidth="2" opacity={1-p}/></g>}
 {result?.outcome==='saved'&&p>=KEEPER_CONTACT&&p<KEEPER_CONTACT+.12&&<g aria-hidden="true" transform={`translate(${contactX} ${contactY})`} opacity={(1-(p-KEEPER_CONTACT)/.12)*.65}><path d="M-13-4L-20-7M10-10L15-16M11 8L18 13" stroke="#e5f2ff" strokeWidth="1.7" strokeLinecap="round"/></g>}
 {postImpact.flash>0&&<g className="pen-post-contact" transform={`translate(${contactX} ${contactY})`} opacity={postImpact.flash} aria-hidden="true"><circle r={12+(1-postImpact.flash)*15} fill="none" stroke="#deefff" strokeWidth="1.6"/><path d="M-23-6L-16-4M19-13L25-18M14 17L19 23" fill="none" stroke="#f6fbff" strokeWidth="2"/></g>}
 <g className="pen-football" data-shot-type={kicked?result?.shotType:undefined} data-outcome={kicked?result?.outcome:'ready'} style={{transform:`translate(${ball.x}px,${ball.y}px) scale(${ball.scale}) rotate(${ball.rotation}deg)`}}><image href={`${ASSETS}ball-v1.webp`} x="-28" y="-28" width="56" height="56"/></g>
 <text x="500" y="634" textAnchor="middle" fill="#deebe1" opacity=".6" fontSize="9" letterSpacing="5">ALTAIR • PENALTY ARENA</text>
 </svg>;
}
