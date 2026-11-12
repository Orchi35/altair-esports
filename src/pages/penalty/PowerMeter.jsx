import {useEffect,useState} from 'react';
import {powerFromMeter} from './shotModel.js';

// Keep frame-by-frame meter updates out of the stadium and the game state.
export default function PowerMeter({phase,meterRef,tr}){
 const [position,setPosition]=useState(0);
 useEffect(()=>{
  if(phase!=='aim')return;
  let frame,start;
  const tick=time=>{
   start??=time;
   const cycle=((time-start)/620)%2;
   const value=cycle<=1?cycle:2-cycle;
   meterRef.current=value;
   setPosition(value);
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[phase,meterRef]);
 const percent=Math.floor(powerFromMeter(position)*100);
 const t=(a,b)=>tr?a:b;
 return <div className="pen-power"><div><span>{t('ŞUT GÜCÜ','SHOT POWER')}</span><strong>{percent}%</strong></div>
  <div className="pen-meter" role="meter" aria-label={t('Şut gücü: ortada yüzde yüz','Shot power: one hundred percent in the center')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
   <span className="pen-sweet"/><span className="pen-meter-cursor" style={{transform:`translate3d(${position*100}%,0,0)`}}><i/></span><b className="pen-meter-center">100%</b>
  </div><div className="pen-meter-scale"><span>0</span><span>{t('TAM ZAMANLAMA','PERFECT TIMING')}</span><span>0</span></div>
  <small>{t('Ortadaki dar yeşil alanı yakala. Yüksek güç ve köşeler kurtarış ihtimalini azaltır.','Hit the narrow green center. Higher power and corner placement reduce the chance of a save.')}</small>
 </div>;
}
