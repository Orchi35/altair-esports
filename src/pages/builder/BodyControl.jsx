import {useRef,useState} from 'react';
import './body-control.css';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Math.round(value)));
function heightLabel(value,imperial){
 if(!imperial)return `${value} cm`;
 const inches=Math.round(value/2.54);
 return `${Math.floor(inches/12)}′ ${inches%12}″`;
}
const weightLabel=(value,imperial)=>imperial?`${Math.round(value*2.20462)} lb`:`${value} kg`;

export default function BodyControl({build,archetype,tr,onChange}){
 const [imperial,setImperial]=useState(false);
 const drag=useRef(null);
 const width=archetype.weight_max-archetype.weight_min;
 const height=archetype.height_max-archetype.height_min;
 const x=width?(build.weight-archetype.weight_min)/width*100:50;
 const y=height?(archetype.height_max-build.height)/height*100:50;
 const update=(values)=>onChange({height:clamp(values.height,archetype.height_min,archetype.height_max),weight:clamp(values.weight,archetype.weight_min,archetype.weight_max)});
 function fromPointer(event){
  const rect=event.currentTarget.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  update({weight:archetype.weight_min+(event.clientX-rect.left)/rect.width*width,height:archetype.height_max-(event.clientY-rect.top)/rect.height*height});
 }
 function start(event){
  if(event.button!==0)return;
  drag.current=event.pointerId;
  event.currentTarget.focus();
  event.currentTarget.setPointerCapture(event.pointerId);
  fromPointer(event);
 }
 function end(event){
  if(drag.current!==event.pointerId)return;
  drag.current=null;
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 }
 function keyboard(event){
  const change={ArrowUp:[1,0],ArrowDown:[-1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[event.key];
  if(!change)return;
  event.preventDefault();
  const amount=event.shiftKey?5:1;
  update({height:build.height+change[0]*amount,weight:build.weight+change[1]*amount});
 }
 const heightText=heightLabel(build.height,imperial),weightText=weightLabel(build.weight,imperial);
 return <section className="builder-panel builder-body-control">
  <div className="builder-panel-title"><h2>{tr?'Fiziksel yapı':'Body'}</h2><div className="builder-unit"><button type="button" aria-pressed={!imperial} onClick={()=>setImperial(false)}>SI</button><button type="button" aria-pressed={imperial} onClick={()=>setImperial(true)}>IMP</button><button type="button" className="builder-body-reset" aria-label={tr?'Boy ve kiloyu sıfırla':'Reset height and weight'} onClick={()=>update({height:archetype.height_def,weight:archetype.weight_def})}>↺</button></div></div>
  <div className="builder-body-values"><div><span>{tr?'Boy':'Height'}</span><strong>{heightText}</strong></div><div><span>{tr?'Kilo':'Weight'}</span><strong>{weightText}</strong></div></div>
  <div className="builder-body-map-wrap">
   <div className="builder-body-axis-top"><span>{heightLabel(archetype.height_max,imperial)}</span><span>{weightLabel(archetype.weight_max,imperial)}</span></div>
   <div className="builder-body-map" role="group" tabIndex={0} aria-label={tr?`Boy ve kilo alanı. Boy ${heightText}, kilo ${weightText}. Yukarı aşağı oklar boyu, sağ sol oklar kiloyu değiştirir.`:`Height and weight pad. Height ${heightText}, weight ${weightText}. Up and down arrows change height; left and right arrows change weight.`} onPointerDown={start} onPointerMove={event=>{if(drag.current===event.pointerId)fromPointer(event);}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={keyboard} style={{'--body-x':`${x}%`,'--body-y':`${y}%`}}>
    <span className="builder-body-crosshair builder-body-crosshair--vertical"/><span className="builder-body-crosshair builder-body-crosshair--horizontal"/><span className="builder-body-point"/>
   </div>
   <div className="builder-body-axis-bottom"><span>{weightLabel(archetype.weight_min,imperial)}</span><span>{heightLabel(archetype.height_min,imperial)}</span></div>
  </div>
  <div className="builder-body-sliders">
   <label><span>{tr?'Boy':'Height'}</span><input aria-label={tr?'Boy':'Height'} type="range" min={archetype.height_min} max={archetype.height_max} value={build.height} onChange={event=>update({height:Number(event.target.value),weight:build.weight})}/></label>
   <label><span>{tr?'Kilo':'Weight'}</span><input aria-label={tr?'Kilo':'Weight'} type="range" min={archetype.weight_min} max={archetype.weight_max} value={build.weight} onChange={event=>update({height:build.height,weight:Number(event.target.value)})}/></label>
  </div>
  <p className="builder-help builder-body-hint">{tr?'Noktayı sürükle veya kaydırıcıları kullan. Etkiler oyun içi değerlerde gösterilir.':'Drag the point or use the sliders. Effects appear in in-game stats.'}</p>
 </section>;
}
