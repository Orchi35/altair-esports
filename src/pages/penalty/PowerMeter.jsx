import {useEffect,useRef} from 'react';
import {powerFromMeter,powerPercentage,PERFECT_WINDOW_HALF_WIDTH} from './shotModel.js';
import {meterPosition} from './shotTiming.js';

// Update only the cursor/readout, without reconciling React on every frame.
export default function PowerMeter({phase,meterRef,tr,timing,verifiedPower}){
 const cursor=useRef(null),readout=useRef(null),meter=useRef(null),lastPosition=useRef(0);
 useEffect(()=>{
  let frame,start,lastPercent=-1;
  function paint(position,power){
   cursor.current.style.transform=`translate3d(${position*100}%,0,0)`;
   const percent=powerPercentage(power??powerFromMeter(position));
   if(percent!==lastPercent){
    readout.current.textContent=`${percent}%`;
    meter.current.setAttribute('aria-valuenow',String(percent));
    lastPercent=percent;
   }
  }
  if(phase!=='aim'){
   const reset=['arming','intro','loading'].includes(phase);
   if(reset)lastPosition.current=0;
   paint(lastPosition.current,reset?0:verifiedPower);
   return;
  }
  const tick=time=>{
   start??=time;
   const value=meterPosition(time-(timing?.localStartsAt??start),timing?.legMs);
   meterRef.current=value;
   lastPosition.current=value;
   paint(value);
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[phase,meterRef,timing,verifiedPower]);
 const t=(a,b)=>tr?a:b;
 return <div className="pen-power"><div><span>{t('ŞUT GÜCÜ','SHOT POWER')}</span><strong ref={readout}>0%</strong></div>
  <div ref={meter} className="pen-meter" role="meter" aria-label={t('Şut gücü: ortada yüzde yüz','Shot power: one hundred percent in the center')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
   <span className="pen-sweet" style={{left:`${(0.5-PERFECT_WINDOW_HALF_WIDTH)*100}%`,width:`${PERFECT_WINDOW_HALF_WIDTH*200}%`}}/><span ref={cursor} className="pen-meter-cursor"><i/></span><b className="pen-meter-center">100%</b>
  </div><div className="pen-meter-scale"><span>0</span><span>{t('TAM ZAMANLAMA','PERFECT TIMING')}</span><span>0</span></div>
  <small>{phase==='arming'?t('Şut hazırlanıyor…','Preparing your shot…'):timing?t('Dereceli vuruş sunucuya ulaşma anına göre hesaplanır. Bağlantı gecikmesi sonucu etkileyebilir.','Ranked power is calculated when the shot reaches the server. Network delay may affect the result.'):t('Ortadaki dar yeşil alanı yakala. Vuruş yüzdesi arttıkça kurtarış ihtimali azalır.','Hit the narrow green center. Higher shot power reduces the chance of a save.')}</small>
 </div>;
}
