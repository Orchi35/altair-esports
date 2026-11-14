import { DATA, calculate, normalizeBuild } from './engine.js';
import { GROUPS, attributeLabel } from './buildModel.js';

const WIDTH = 1600;
const C = { bg:'#071321', panel:'#0d2032', line:'#24425a', text:'#f2f8fc', muted:'#a4bdce', ice:'#8cddf4', accent:'#39a7ca' };

// Split at words when possible, but also handle URLs and unbroken names without clipping.
export function wrapCardText(ctx, value, width) {
 const lines=[];
 for (const paragraph of String(value ?? '').replace(/\r\n?/g,'\n').split('\n')) {
  if (!paragraph) { lines.push(''); continue; }
  let line='';
  for (const word of paragraph.split(/\s+/)) {
   const candidate=line ? `${line} ${word}` : word;
   if (ctx.measureText(candidate).width<=width) { line=candidate; continue; }
   if (line) { lines.push(line); line=''; }
   let part='';
   for (const char of word) {
    if (part && ctx.measureText(part+char).width>width) { lines.push(part); part=''; }
    part+=char;
   }
   line=part;
  }
  lines.push(line);
 }
 return lines;
}

function localImage(src) {
 return new Promise(resolve=>{
  if (!src) return resolve(null);
  try {
   const url=new URL(src,window.location.href);
   if (url.origin!==window.location.origin) return resolve(null);
   const image=new Image();
   const finish=value=>{clearTimeout(timer);image.onload=null;image.onerror=null;resolve(value);};
   const timer=setTimeout(()=>finish(null),3000);
   image.onload=()=>finish(image); image.onerror=()=>finish(null); image.src=url.href;
  } catch { resolve(null); }
 });
}
const money=n=>`${(n/1000000).toFixed(2)}M`;

export async function renderBuildCard(input,{locale='tr',shareUrl=''}={}) {
 const build=normalizeBuild(input), result=calculate(build), a=result.archetype, tr=locale==='tr';
 if (document.fonts?.ready) await document.fonts.ready;
 const icon=await localImage(a.image);
 const canvas=document.createElement('canvas'); canvas.width=WIDTH; canvas.height=1;
 const ctx=canvas.getContext('2d');
 if (!ctx) throw new Error('Canvas is unavailable');
 const font=(size,weight=400)=>`${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
 const styleName=(id,plus=false)=>`${DATA.playstyles.find(p=>p.id===id)?.engName ?? `#${id}`}${plus?'+':''}`;
 const spec=DATA.specializations.find(s=>s.id===build.specialization);
 const perks=[a.perk_1,a.perk_2].map((id,i)=>`${DATA.perks.find(p=>p.id===id)?.name ?? `#${id}`} · ${i<Number(DATA.levelPerks[build.level-1]||0)?(tr?'Etkin':'Active'):(tr?'Kilitli':'Locked')}`);
 const facilityRows=build.facilities.map(row=>{const f=DATA.facilities.find(item=>item.id===row.id);return `${f?.name_eng ?? `#${row.id}`}${f?.ai?' · AI':''}  /  Lv. ${row.level}  /  ${money(f?.[`level_${row.level}_cost`]||0)}`;});
 const masteryRows=DATA.masteries.filter(m=>a.position==='GK'||DATA.archetypes.find(item=>item.id===m.archetypeId)?.position!=='GK').map(m=>`${DATA.archetypes.find(item=>item.id===m.archetypeId)?.name ?? m.archetypeId}: ${build.masteryCustom?(build.masteryLevels[m.archetypeId]||0):build.mastery}`);
 // Preserve custom settings for every archetype, including those currently inapplicable.
 if(build.masteryCustom) for(const [id,rank] of Object.entries(build.masteryLevels)) if(!DATA.masteries.some(m=>String(m.archetypeId)===id && (a.position==='GK'||DATA.archetypes.find(item=>item.id===m.archetypeId)?.position!=='GK'))) masteryRows.push(`${DATA.archetypes.find(item=>String(item.id)===id)?.name ?? id}: ${rank}`);
 const retainedMastery=Object.entries(build.masteryLevels).map(([id,rank])=>`${DATA.archetypes.find(item=>String(item.id)===id)?.name ?? id}: ${rank}`);
 const groups=GROUPS.map(([id,t,e,keys])=>({id,label:tr?t:e,keys:keys.filter(k=>Number.isFinite(result.attributes[k]))})).filter(g=>g.keys.length);
 const none=tr?'Seçilmedi':'None selected';
 let y=0;
 function paint(draw) {
  y=0;
  const rect=(x,top,w,h,fill,stroke)=>{if(!draw)return;ctx.fillStyle=fill;ctx.fillRect(x,top,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.strokeRect(x+.5,top+.5,w-1,h-1);}};
  const text=(str,x,top,size=24,color=C.text,weight=400,align='left')=>{if(!draw)return;ctx.font=font(size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(String(str),x,top);};
  const lines=(value,x,top,width,size=24,color=C.text,weight=400,lineHeight=34)=>{ctx.font=font(size,weight);const rows=wrapCardText(ctx,value,width);rows.forEach((row,i)=>text(row,x,top+i*lineHeight,size,color,weight));return rows.length*lineHeight;};
  const section=(title,entries)=>{
   const top=y; let inner=top+78;
   for(const [label,value] of entries){
    text(label.toLocaleUpperCase(locale),94,inner,17,C.ice,700);inner+=29;
    inner+=lines(value,94,inner,1412,24,C.text,500,34)+20;
   }
   rect(64,top,1472,inner-top+9,C.panel,C.line);
   rect(64,top,4,inner-top+9,C.accent);
   // Paint content again on top of its background.
   text(title,94,top+25,27,C.text,750);let rowY=top+78;
   for(const [label,value] of entries){text(label.toLocaleUpperCase(locale),94,rowY,17,C.ice,700);rowY+=29;rowY+=lines(value,94,rowY,1412,24,C.text,500,34)+20;}
   y=inner+33;
  };
  if(draw){const gradient=ctx.createLinearGradient(0,0,WIDTH,500);gradient.addColorStop(0,'#102c41');gradient.addColorStop(1,C.bg);ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,canvas.height);}
  text('ALTAIR  /  CLUBS LAB',64,54,22,C.ice,750);
  text('FC 27  •  BUILD REPORT',1536,55,19,C.muted,700,'right');
  const title=build.name || a.name;
  const titleHeight=lines(title,64,115,1190,52,C.text,750,63);
  const headBottom=Math.max(260,130+titleHeight+34);
  text(`${a.name}  /  ${a.position}  /  LV. ${build.level}`,64,130+titleHeight,24,C.muted,650);
  if(draw&&icon)ctx.drawImage(icon,1375,94,132,156);
  else text(a.position,1440,139,36,C.ice,750,'center');
  y=headBottom+25;
  const metrics=[[tr?'HARCanAN AP':'AP SPENT',`${result.spentAP} / ${result.totalAP}`],[tr?'KALAN AP':'AP REMAINING',result.remainingAP],[tr?'BOY / KİLO':'HEIGHT / WEIGHT',`${build.height} cm / ${build.weight} kg`],[tr?'BECERİ / ZAYIF AYAK':'SKILL / WEAK FOOT',`${build.skillMoves}★ / ${build.weakFoot}★`],[tr?'KOŞU TÜRÜ':'ACCELERATE',result.accelerate]];
  const gap=12,w=(1472-gap*4)/5;
  metrics.forEach(([label,value],i)=>{const x=64+i*(w+gap);rect(x,y,w,104,C.panel,C.line);text(label.toLocaleUpperCase(locale),x+17,y+18,15,C.muted,700);text(value,x+17,y+49,25,C.text,700);});y+=132;
  text(tr?'KATEGORİ DEĞERLERİ  /  TÜM BONUSLAR':'CATEGORY RATINGS  /  ALL BONUSES',64,y,20,C.ice,750);y+=38;
  const ratingW=(1472-12*(groups.length-1))/groups.length;
  groups.forEach((g,i)=>{const x=64+i*(ratingW+12);rect(x,y,ratingW,92,C.panel,C.line);text(g.label,x+13,y+15,16,C.muted,650);const rating=result.categoryRatings[g.id];text(Number.isFinite(rating)?rating:'—',x+13,y+43,30,C.text,750);rect(x+62,y+66,ratingW-75,4,C.line);rect(x+62,y+66,(ratingW-75)*Math.max(0,Math.min(99,Number.isFinite(rating)?rating:0))/99,4,C.accent);});y+=125;
  text(tr?'OYUNCU ÖZELLİKLERİ':'PLAYER ATTRIBUTES',64,y,27,C.text,750);y+=38;
  text(tr?'TEMEL = AP DEĞERİ   /   OYUN = TÜM BONUSLAR':'BASE = AP RATING   /   GAME = ALL BONUSES',64,y,17,C.muted,650);y+=38;
  for(let i=0;i<groups.length;i+=2){
   const pair=groups.slice(i,i+2), h=65+Math.max(...pair.map(g=>g.keys.length))*38;
   pair.forEach((g,col)=>{const x=64+col*746;rect(x,y,726,h,C.panel,C.line);rect(x,y,4,h,C.accent);text(g.label.toLocaleUpperCase(locale),x+22,y+19,20,C.ice,750);text(tr?'TEMEL':'BASE',x+565,y+21,15,C.muted,700,'right');text(tr?'OYUN':'GAME',x+698,y+21,15,C.muted,700,'right');g.keys.forEach((key,j)=>{const rowY=y+57+j*38;text(attributeLabel(key,tr),x+22,rowY,21,C.text,500);text(result.attributes[key],x+565,rowY,21,C.muted,600,'right');text(result.finalAttributes[key],x+698,rowY,21,C.ice,750,'right');});});y+=h+20;
  }
  y+=12;
  section(tr?'OYUN STİLLERİ VE UZMANLAŞMA':'PLAYSTYLES AND SPECIALIZATION',[
   [tr?'İmza stilleri':'Signature styles',result.signature.map(p=>styleName(p.id,p.plus)).join(' · ')||none],
   [tr?'Seçilen stiller':'Selected styles',build.playstyles.map(id=>styleName(id)).join(' · ')||none],
   [tr?'Tesis stilleri':'Facility styles',result.facilityPlaystyles.map(p=>styleName(p.id,p.plus)).join(' · ')||none],
   [tr?'Uzmanlaşma':'Specialization',spec?.nameEng||none],
   [tr?'Arketip yetenekleri':'Archetype perks',perks.join('  /  ')]
  ]);
  section(tr?'TESİSLER':'FACILITIES',[[tr?'Bütçe ve harcama':'Budget and expenditure',`${money(result.facilityCost)} / ${money(build.budget*1000000)} · AI ${build.includeAI?(tr?'bonusları dahil':'bonuses included'):(tr?'bonusları hariç':'bonuses excluded')}`],[tr?'Seçilen tesisler':'Selected facilities',facilityRows.join('\n')||none]]);
  section('MASTERY',[[tr?'Mod':'Mode',build.masteryCustom?(tr?'Özel':'Custom'):`${tr?'Genel':'Global'} · ${build.mastery}`],[tr?'Arketip seviyeleri':'Archetype levels',masteryRows.join('   ·   ')||none],...(!build.masteryCustom&&retainedMastery.length?[[tr?'Kayıtlı özel seviyeler (etkin değil)':'Saved custom levels (inactive)',retainedMastery.join('   ·   ')]]:[])]);
  if(build.notes) section(tr?'BUILD NOTLARI':'BUILD NOTES',[[tr?'Notlar':'Notes',build.notes.replace(/\r\n?/g,'\n').replace(/\n(?:[ \t]*\n){2,}/g,'\n\n')]]);
  if(shareUrl && shareUrl.length<=240) section(tr?'PAYLAŞIM BAĞLANTISI':'SHARE LINK',[[tr?'Bağlantı':'Link',shareUrl]]);
  text('ALTAIR ESPORTS  /  FC 27 BUILDER',64,y+8,17,C.muted,700);text('ALTAIR',1536,y+8,20,C.ice,750,'right');y+=76;
 }
 paint(false); canvas.height=Math.ceil(y); paint(true);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 if(!blob) throw new Error('PNG export failed');
 const slug=(build.name||a.name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'build';
 return {blob,width:canvas.width,height:canvas.height,filename:`altair-fc27-${slug}.png`};
}
