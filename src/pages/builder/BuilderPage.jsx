import {useEffect,useState} from 'react';
import {ContentPage} from '../../components/layout/ContentPage.jsx';
import {getRoutePath} from '../../app/routes.js';
import {DATA,makeBuild,calculate,applySelection,attributeCost} from './engine.js';
import {GROUPS,encodeBuild,loadInitialBuild,attributeLabel} from './buildModel.js';
import {PlayStylesPanel,SpecializationsPanel,FacilitiesPanel,MasteryPanel} from './BuilderPanels.jsx';
import BodyControl from './BodyControl.jsx';
import {BuildLibrary} from './BuildLibrary.jsx';
import './builder.css';
import './builder-layout.css';

function initialBuild(){try{return loadInitialBuild(window.location.hash,window.localStorage);}catch{return {build:makeBuild(),source:'new'};}}

export default function BuilderPage({locale='tr'}){
 const tr=locale==='tr';
 const [initial]=useState(initialBuild);
 const [build,setBuild]=useState(initial.build);
 const [status,setStatus]=useState(initial.source==='invalid'?(tr?'Paylaşım bağlantısı geçersiz. Yeni bir build açıldı.':'Invalid share link. A new build has been opened.'):initial.source==='shared'?(tr?'Paylaşılan build açıldı. Seçimleri değiştirerek kendi sürümünü oluşturabilirsin.':'Shared build loaded. Change the selections to create your own version.'):'');
 const [shareLink,setShareLink]=useState('');
 const [inGame,setInGame]=useState(false);
 const [attributeGroup,setAttributeGroup]=useState('all');
 const [bonuses,setBonuses]=useState({body:true,facilities:true,mastery:true});
 useEffect(()=>{if(!status)return;const timer=setTimeout(()=>setStatus(''),6500);return()=>clearTimeout(timer);},[status]);
 const result=calculate(build,inGame?bonuses:{body:false,facilities:false,mastery:false});
 const archetype=result.archetype;
 function commit(candidate){
  const check=calculate(candidate);
  if(check.errors.length){setStatus(`${tr?'Seçim uygulanamadı':'Selection could not be applied'}: ${check.errors.join(' · ')}`);return false;}
  setBuild(candidate);setStatus('');setShareLink('');return true;
 }
 function update(key,value){commit(key==='masteryMode'?{...build,mastery:value,masteryCustom:false}:{...build,[key]:value});}
 function select(kind,id){try{commit(applySelection(build,kind,id));}catch(error){setStatus(error.message);}}
 function setAttribute(key,value){
  if(value==='')return;
  const target=Math.max(archetype.defaultAttributes[key],Math.min(archetype.maxAttributes[key],Math.round(Number(value))));
  if(!Number.isFinite(target))return;
  const candidate={...build,attributes:{...build.attributes,[key]:target}};
  if(calculate(candidate).remainingAP<0&&target>build.attributes[key]){
   let affordable=build.attributes[key];
   for(let n=affordable+1;n<=target;n++){if(calculate({...candidate,attributes:{...candidate.attributes,[key]:n}}).remainingAP<0)break;affordable=n;}
   commit({...candidate,attributes:{...candidate.attributes,[key]:affordable}});
   setStatus(tr?'Kalan AP ile ulaşılabilen en yüksek değer uygulandı.':'Applied the highest value affordable with the remaining AP.');
  }else commit(candidate);
 }
 function changeArchetype(id){
  if(id===build.archetypeId)return;
  const next={...makeBuild(id),level:build.level,name:build.name,notes:build.notes};
  commit(next);setAttributeGroup('all');
 }
 function reset(){commit({...makeBuild(build.archetypeId),level:build.level,name:build.name,notes:build.notes});}
 function resetAttributes(){commit({...build,attributes:{...archetype.defaultAttributes},playstyles:[],specialization:null});}
 async function share(){try{const link=`${window.location.origin}${getRoutePath('builder',locale)}#build=${encodeBuild(build)}`;setShareLink(link);window.history.replaceState(null,'',`#build=${encodeBuild(build)}`);try{await navigator.clipboard.writeText(link);setStatus(tr?'Paylaşım bağlantısı kopyalandı.':'Share link copied.');}catch{setStatus(tr?'Bağlantıyı aşağıdan kopyalayabilirsin.':'Copy the link below.');}}catch(error){setStatus(error.message);}}
 const labels={body:tr?'Boy / kilo':'Height / weight',facilities:tr?'Tesisler':'Facilities',mastery:'Mastery'};
 const groups=GROUPS.map(([id,t,e,keys])=>[id,t,e,keys.filter(key=>Number.isFinite(archetype.defaultAttributes[key]))]).filter(row=>row[3].length);
 const activePerks=Number(DATA.levelPerks[build.level-1]||0);
 return <ContentPage className="builder-page" breadcrumbLabel="FC27 Builder" breadcrumbs={[{label:tr?'Ana Sayfa':'Home',href:getRoutePath('home',locale)},{label:'FC27 Builder'}]} eyebrow="ALTAIR LAB / CLUBS" title="FC27 Pro Clubs Builder" intro={tr?'Arketipini seç, AP’ni dağıt ve oyuncunu oluştur. Build’ini üyelik gerektirmeden bağlantıyla paylaş.':'Choose your archetype, allocate AP and build your player. Share your build with a link, without an account.'}>
 <div className="builder-workspace">
  <div className="builder-toolbar"><label>{tr?'Build adı':'Build name'}<input maxLength="80" value={build.name} onChange={e=>update('name',e.target.value)} placeholder={tr?'Örn. Çevik bitirici':'e.g. Agile finisher'}/></label><div><button onClick={reset}>{tr?'Sıfırla':'Reset'}</button><BuildLibrary build={build} onLoad={commit} tr={tr}/><button className="builder-primary" onClick={share}>{tr?'Bağlantıyla paylaş ↗':'Share link ↗'}</button></div></div>
  <p className="builder-status" role="status" aria-live="polite">{status}</p>
  {shareLink&&<label className="builder-share">{tr?'Paylaşım bağlantısı':'Share link'}<input readOnly value={shareLink} onFocus={e=>e.target.select()}/></label>}
  <section className="builder-archetypes" aria-label={tr?'Arketip seçimi':'Archetype selection'}><div className="builder-panel-title"><h2>{tr?'Arketip':'Archetype'}</h2><span className="builder-help">{tr?'Arketip değişimi özellik dağılımını sıfırlar.':'Changing archetype resets attribute allocation.'}</span></div><div className="builder-archetype-list">{DATA.archetypes.map(a=><button key={a.id} aria-pressed={a.id===build.archetypeId} onClick={()=>changeArchetype(a.id)}><img src={a.image} width="64" height="76" alt=""/><span>{a.name}</span></button>)}</div></section>
  <div className="builder-ap-bar"><span>{archetype.name} <small>Lv. {build.level}</small></span><div><span>{tr?'Harcanan':'Spent'} <strong>{result.spentAP}</strong></span><span>{tr?'Toplam':'Total'} <strong>{result.totalAP}</strong></span><span className="builder-ap-remaining">{tr?'Kalan AP':'Remaining AP'} <strong>{result.remainingAP}</strong></span></div></div>
  <div className="builder-layout">
   <aside className="builder-sidebar">
    <section className="builder-player-card" aria-label={tr?'Oyuncu özeti':'Player overview'}><div className="builder-card-top"><span>ALTAIR <small>CLUBS / 27</small></span><img src={archetype.image} alt="" width="64" height="64"/></div><div className="builder-player-portrait"><img src="/builder/player-silhouette-v2.png" alt={tr?"Anonim oyuncu silüeti":"Anonymous player silhouette"} width="1254" height="1254"/></div><h2>{archetype.name}</h2><div className="builder-card-stats">{(archetype.position==='GK'?[['DIV','gkDiving'],['HAN','gkHandling'],['KIC','gkKicking'],['REF','gkReflexes'],['SPD','sprintSpeed'],['POS','gkPositioning']]:[['PAC','pace'],['SHO','shooting'],['PAS','passing'],['DRI','dribbling'],['DEF','defending'],['PHY','physical']]).map(([label,key])=><span key={key}><strong>{Math.round(result.categoryRatings[key]??result.finalAttributes[key]??0)}</strong>{label}</span>)}</div></section>
    <section className="builder-panel builder-level-panel"><label className="builder-range">{tr?'Oyuncu seviyesi':'Player level'}<output>{build.level}</output><input aria-label={tr?'Oyuncu seviyesi':'Player level'} type="range" min="1" max="55" value={build.level} onChange={e=>update('level',Number(e.target.value))}/></label><div className="builder-metric"><span>{tr?'Toplam AP':'Total AP'}</span><strong>{result.totalAP}</strong></div><div className="builder-metric"><span>{tr?'Kalan AP':'Remaining AP'}</span><strong>{result.remainingAP}</strong></div><div className="builder-metric"><span>{tr?'Gereken XP':'Required XP'}</span><strong>{Number(DATA.levelXP[build.level-1]||0).toLocaleString(locale)}</strong></div></section>
    <BodyControl build={build} archetype={archetype} tr={tr} onChange={values=>commit({...build,...values})}/>
    <section className="builder-panel"><h2>{tr?'Arketip yetenekleri':'Archetype perks'}</h2><div className="builder-perks">{[archetype.perk_1,archetype.perk_2].map((id,i)=><div key={id} className={i<activePerks?'active':''}><span>{i<activePerks?'●':'○'}</span><strong>{DATA.perks.find(p=>p.id===id)?.name||'—'}</strong><small>{i<activePerks?(tr?'Etkin':'Active'):(tr?'Kilitli':'Locked')}</small></div>)}</div></section>
    <FacilitiesPanel build={build} result={result} update={update} commit={commit} tr={tr}/>
   </aside>
   <div className="builder-main">
    <PlayStylesPanel build={build} result={result} select={select} update={update} commit={commit} tr={tr}/>
    <div className="builder-two"><section className="builder-panel"><h2>{tr?'Teknik beceriler':'Technical skills'}</h2>{[['skillMoves',tr?'Beceri hareketleri':'Skill moves','skill_move','skill_max'],['weakFoot',tr?'Zayıf ayak':'Weak foot','weak_foot','weak_max']].map(([key,label,min,max])=><div className="builder-stars" key={key}><span>{label}<small>{build[key]} / {archetype[max]}</small></span><div>{[1,2,3,4,5].map(n=><button key={n} disabled={n<archetype[min]||n>archetype[max]} className={n<=build[key]?'selected':''} aria-label={`${label}: ${n}`} aria-pressed={n===build[key]} onClick={()=>update(key,n)}>★</button>)}</div></div>)}</section><SpecializationsPanel build={build} result={result} select={select} update={update} tr={tr}/></div>
    <MasteryPanel build={build} result={result} update={update} tr={tr}/>
    <section className="builder-panel builder-attributes"><div className="builder-panel-title"><h2>{tr?'Oyuncu özellikleri':'Player attributes'}</h2><div className="builder-unit"><button onClick={resetAttributes}>{tr?'Özellikleri sıfırla':'Reset attributes'}</button><button aria-pressed={!inGame} onClick={()=>setInGame(false)}>{tr?'Temel değerler':'Base stats'}</button><button aria-pressed={inGame} onClick={()=>setInGame(true)}>{tr?'Oyun içi değerler':'In-game stats'}</button></div></div><div className="builder-bonus-toggles">{Object.keys(bonuses).map(key=><label className="builder-check" key={key}><input type="checkbox" checked={bonuses[key]} disabled={!inGame} onChange={e=>setBonuses({...bonuses,[key]:e.target.checked})}/>{labels[key]}</label>)}</div><p className="builder-help">{tr?'Kaydırıcılar temel özelliklere AP dağıtır. Oyun içi görünümde etkin bonuslar ayrıca gösterilir.':'Sliders allocate AP to base attributes. In-game view also displays enabled bonuses.'}</p><div className="builder-attribute-nav" aria-label={tr?'Özellik kategorileri':'Attribute categories'}><button aria-pressed={attributeGroup==='all'} onClick={()=>setAttributeGroup('all')}>{tr?'Tümü':'All'}</button>{groups.map(([id,t,e])=><button key={id} aria-pressed={attributeGroup===id} onClick={()=>setAttributeGroup(id)}>{tr?t:e}</button>)}</div><div className="builder-attribute-groups">{[...groups].sort((a,b)=>archetype.position==='GK'?(a[0]==='goalkeeper'?-1:b[0]==='goalkeeper'?1:0):0).filter(([id])=>attributeGroup==='all'||attributeGroup===id).map(([category,turkish,english,keys])=><section className="builder-attribute-group" key={category}><h3>{tr?turkish:english}<small>{Math.round(result.categoryRatings[category]||0)}</small></h3>{keys.map(key=>{const bonus=result.finalAttributes[key]-build.attributes[key];const keyAttribute=archetype.keyAttributes.includes(DATA.attributes.find(a=>a.key===key)?.id);return <div className="builder-attribute" key={key}><label htmlFor={`builder-${key}`}>{attributeLabel(key,tr)}{keyAttribute&&<span className="builder-key-attribute" title={tr?'Arketip ana özelliği':'Archetype key attribute'}> ◆</span>}<small>{attributeCost(build.archetypeId,key,archetype.defaultAttributes[key],build.attributes[key])} AP</small></label><div className="builder-stat-value"><button className="builder-step" aria-label={`${attributeLabel(key,tr)} −1`} disabled={build.attributes[key]<=archetype.defaultAttributes[key]} onClick={()=>setAttribute(key,build.attributes[key]-1)}>−</button><input id={`builder-${key}`} type="number" min={archetype.defaultAttributes[key]} max={archetype.maxAttributes[key]} value={build.attributes[key]} onChange={e=>setAttribute(key,e.target.value)}/><button className="builder-step" aria-label={`${attributeLabel(key,tr)} +1`} disabled={build.attributes[key]>=archetype.maxAttributes[key]||result.remainingAP<attributeCost(build.archetypeId,key,build.attributes[key],build.attributes[key]+1)} onClick={()=>setAttribute(key,build.attributes[key]+1)}>+</button>{inGame&&<span className={bonus<0?'negative':bonus>0?'positive':''}>{result.finalAttributes[key]} <small>{bonus>0?`+${bonus}`:bonus<0?bonus:'—'}</small></span>}</div><input style={{'--stat-fill':`${(build.attributes[key]-archetype.defaultAttributes[key])/(archetype.maxAttributes[key]-archetype.defaultAttributes[key])*100}%`}} aria-label={`${attributeLabel(key,tr)} AP`} type="range" min={archetype.defaultAttributes[key]} max={archetype.maxAttributes[key]} value={build.attributes[key]} onChange={e=>setAttribute(key,e.target.value)}/><div className="builder-stat-scale"><span>{archetype.defaultAttributes[key]}</span><span>{archetype.maxAttributes[key]}</span></div></div>;})}{category==='pace'&&<div className="builder-accelerate-info" role="status"><span>{tr?'AcceleRATE Koşu Türü':'AcceleRATE Type'}</span><strong>{result.accelerate}</strong></div>}</section>)}</div></section>
    <details className="builder-panel builder-notes"><summary>{tr?'Build notları':'Build notes'}</summary><textarea aria-label={tr?'Build notları':'Build notes'} rows="3" maxLength="1000" value={build.notes} onChange={e=>update('notes',e.target.value)}/></details>
   </div>
  </div>
 </div>
 </ContentPage>;
}

