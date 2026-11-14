import {useLayoutEffect,useRef} from 'react';
import {powerFromMeter,powerPercentage,PERFECT_WINDOW_HALF_WIDTH,PANENKA_PERFECT_WINDOW_HALF_WIDTH} from './shotModel.js';

// Update only the cursor/readout, without reconciling React on every frame.
export default function PowerMeter({phase,meterClock,tr,verifiedPower,verifiedPosition,shotType='normal'}){
 const cursor=useRef(null),readout=useRef(null),meter=useRef(null),lastPosition=useRef(0);
 const shotTypeRef=useRef(shotType);
 useLayoutEffect(()=>{shotTypeRef.current=shotType;},[shotType]);
 const perfectWidth=shotType==='panenka'?PANENKA_PERFECT_WINDOW_HALF_WIDTH:PERFECT_WINDOW_HALF_WIDTH;
 useLayoutEffect(()=>{
  let frame,lastPercent=-1;
  function paint(position,power){
   cursor.current.style.transform=`translate3d(${position*100}%,0,0)`;
   const percent=powerPercentage(power??powerFromMeter(position,shotTypeRef.current));
   if(percent!==lastPercent){
    readout.current.textContent=`${percent}%`;
    meter.current.setAttribute('aria-valuenow',String(percent));
    lastPercent=percent;
   }
  }
  if(phase!=='aim'){
   const reset=['arming','intro','loading'].includes(phase);
   if(reset)lastPosition.current=0;
   // The result cursor and readout must describe the same sampled instant.
   // Older cached API responses may contain power only; keep those consistent too.
   const fallback=verifiedPower===1?.5:lastPosition.current>.5?1-verifiedPower/2:verifiedPower/2;
   const position=Number.isFinite(verifiedPosition)?verifiedPosition:Number.isFinite(verifiedPower)?fallback:lastPosition.current;
   paint(reset?0:position,reset?0:verifiedPower);
   return;
  }
  const clock=meterClock.current;
  clock.begin();
  const onVisibility=()=>clock.invalidateFrame();
  document.addEventListener('visibilitychange',onVisibility);
  const tick=()=>{
   const value=clock.frame(document.visibilityState==='visible');
   if(value!==null){lastPosition.current=value;paint(value);}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',onVisibility);clock.end();};
 },[phase,meterClock,verifiedPower,verifiedPosition]);
 const t=(a,b)=>tr?a:b;
 return <div className="pen-power"><div><span>{verifiedPower!=null?t('ŞUT SONUCU','SHOT RESULT'):phase==='pending'?t('ŞUT DOĞRULANIYOR…','VERIFYING SHOT…'):t('ŞUT GÜCÜ','SHOT POWER')}</span><strong ref={readout}>0%</strong></div>
  <div ref={meter} className="pen-meter" role="meter" aria-label={t('Şut gücü: ortada yüzde yüz','Shot power: one hundred percent in the center')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
   <span className="pen-sweet" style={{left:`${(0.5-perfectWidth)*100}%`,width:`${perfectWidth*200}%`}}/><span ref={cursor} className="pen-meter-cursor"><i/></span><b className="pen-meter-center">100%</b>
  </div><div className="pen-meter-scale"><span>0</span><span>{t('TAM ZAMANLAMA','PERFECT TIMING')}</span><span>0</span></div>
  <small>{t('Güç basış anında hesaplanır. Ortadaki dar yeşil alanı yakala.','Power is measured at the instant you press. Hit the narrow green center.')}</small>
 </div>;
}
