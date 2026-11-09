import {DATA,requirementsFor} from './engine.js';
import {attributeLabel} from './buildModel.js';
export {PlayStylesSelection as PlayStylesPanel,FacilitiesSelection as FacilitiesPanel} from './SelectionPanels.jsx';

export function StyleIcon({id,plus=false}){const item=DATA.playstyles.find(p=>p.id===id);return item?<img className="builder-style-icon" src={plus?item.plusImage:item.image} alt="" width="64" height="64" loading="lazy"/>:null;}
export function Radar({result,final,tr}) {
 const isGK=result.archetype.position==='GK';
 const keys=isGK?['gkDiving','gkHandling','gkKicking','gkReflexes','sprintSpeed','gkPositioning']:['pace','shooting','passing','dribbling','defending','physical'];
 const labels=isGK?['DIV','HAN','KIC','REF','SPD','POS']:['PAC','SHO','PAS','DRI','DEF','PHY'];
 const point=(i,r)=>[120+Math.sin(i*Math.PI/3)*r,120-Math.cos(i*Math.PI/3)*r];
 const values=keys.map(k=>isGK?(final?result.finalAttributes[k]:result.attributes[k]):result.categoryRatings[k]);
 return <svg viewBox="0 0 240 240" className="builder-radar" role="img" aria-label={tr?'Oyuncu özellik grafiği':'Player attribute chart'}>
 {[20,40,60,80].map(r=><polygon key={r} points={keys.map((_,i)=>point(i,r).join(',')).join(' ')} fill="none" stroke="#354456"/>)}
 {keys.map((_,i)=><line key={i} x1="120" y1="120" x2={point(i,80)[0]} y2={point(i,80)[1]} stroke="#354456"/>)}
 <polygon points={values.map((v,i)=>point(i,(v||0)/99*80).join(',')).join(' ')} fill="#83bbff30" stroke="#a3ccff" strokeWidth="2"/>
 {labels.map((l,i)=><text key={l} x={point(i,103)[0]} y={point(i,103)[1]+4} textAnchor="middle" fill="#dce9fa" fontSize="11">{l} {Math.round(values[i]||0)}</text>)}
 </svg>;
}

export function SpecializationsPanel({build,result,select,update,tr}) {
 return <section className="builder-panel"><div className="builder-panel-title"><h2>{tr?'Uzmanlaşma':'Specialization'}</h2>{build.specialization!==null&&<button onClick={()=>update('specialization',null)}>{tr?'Kaldır':'Remove'}</button>}</div><div className="builder-spec-grid">{DATA.specializations.filter(s=>s.archetypeId===result.archetype.id).map(s=><button key={s.id} aria-pressed={build.specialization===s.id} onClick={()=>select('specialization',s.id)}><StyleIcon id={s.sig_playstyle} plus/><strong>{s.nameEng}</strong><small>{requirementsFor(build,'specialization',s.id).map(r=>`${attributeLabel(r.key,tr)} ${r.requiredValue}`).join(' · ')}</small></button>)}</div></section>;
}

export function MasteryPanel({build,result,update,tr}) {
 return <section className="builder-panel"><div className="builder-panel-title"><h2>Mastery</h2><div className="builder-unit"><button aria-pressed={build.masteryCustom} onClick={()=>update('masteryCustom',!build.masteryCustom)}>{tr?'Özel':'Custom'}</button>{[0,10,30,55].map(n=><button key={n} aria-pressed={!build.masteryCustom&&build.mastery===n} onClick={()=>update('masteryMode',n)}>{n===0?(tr?'Yok':'None'):`Lv. ${n}`}</button>)}</div></div><p className="builder-help">{tr?'Mastery seviyesi oyuncu seviyesinden bağımsızdır. Kaleciler tüm arketiplerden, saha oyuncuları saha arketiplerinden bonus alır.':'Mastery is independent of player level. Keepers receive all archetype bonuses; outfield players receive outfield bonuses.'}</p>{build.masteryCustom&&<div className="builder-mastery-grid">{DATA.archetypes.filter(a=>result.archetype.position==='GK'||a.position!=='GK').map(a=><label key={a.id}><img src={a.image} alt="" width="32" height="40"/>{a.name}<select aria-label={`${a.name} Mastery`} value={build.masteryLevels[a.id]||0} onChange={e=>update('masteryLevels',{...build.masteryLevels,[a.id]:Number(e.target.value)})}>{[0,10,30,55].map(n=><option key={n} value={n}>{n===0?'—':n}</option>)}</select></label>)}</div>}</section>;
}
