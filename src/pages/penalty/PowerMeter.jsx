import {useEffect,useState} from 'react';
import {powerFromMeter,powerPercentage,PERFECT_WINDOW_HALF_WIDTH} from './shotModel.js';
import {meterPosition} from './shotTiming.js';

// Keep frame-by-frame meter updates out of the stadium and the game state.
export default function PowerMeter({phase,meterRef,tr,timing,verifiedPower}){
 const [position,setPosition]=useState(0);
 useEffect(()=>{
  if(phase!=='aim')return;
  let frame,start;
  const tick=time=>{
   start??=time;
   const value=meterPosition(time-(timing?.localStartsAt??start),timing?.legMs);
   meterRef.current=value;
   setPosition(value);
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[phase,meterRef,timing]);
 const shownPosition=phase==='arming'||phase==='intro'||phase==='loading'?0:position;
 const percent=powerPercentage(phase!=='aim'&&verifiedPower!=null?verifiedPower:powerFromMeter(shownPosition));
 const t=(a,b)=>tr?a:b;
 return <div className="pen-power"><div><span>{t('ŞUT GÜCÜ','SHOT POWER')}</span><strong>{percent}%</strong></div>
  <div className="pen-meter" role="meter" aria-label={t('Şut gücü: ortada yüzde yüz','Shot power: one hundred percent in the center')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
   <span className="pen-sweet" style={{left:`${(0.5-PERFECT_WINDOW_HALF_WIDTH)*100}%`,width:`${PERFECT_WINDOW_HALF_WIDTH*200}%`}}/><span className="pen-meter-cursor" style={{transform:`translate3d(${shownPosition*100}%,0,0)`}}><i/></span><b className="pen-meter-center">100%</b>
  </div><div className="pen-meter-scale"><span>0</span><span>{t('TAM ZAMANLAMA','PERFECT TIMING')}</span><span>0</span></div>
  <small>{phase==='arming'?t('Şut hazırlanıyor…','Preparing your shot…'):timing?t('Dereceli vuruş sunucuya ulaşma anına göre hesaplanır. Bağlantı gecikmesi sonucu etkileyebilir.','Ranked power is calculated when the shot reaches the server. Network delay may affect the result.'):t('Ortadaki dar yeşil alanı yakala. Vuruş yüzdesi arttıkça kurtarış ihtimali azalır.','Hit the narrow green center. Higher shot power reduces the chance of a save.')}</small>
 </div>;
}
