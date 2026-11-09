import DATA from './data/fc27.json' with { type: 'json' };
export { DATA };
const attr = Object.fromEntries(DATA.attributes.map(a => [a.id, a.key]));
const ranks = [0, 10, 30, 55];
const archetypeFor = id => DATA.archetypes.find(a => a.id === id);
const clone = x => JSON.parse(JSON.stringify(x));
const add = (obj, id, value) => { const key = attr[id]; if (key && value) obj[key] = (obj[key] || 0) + value; };

export function makeBuild(archetypeId = 12) {
  const a = archetypeFor(archetypeId);
  if (!a) throw new Error('Unknown archetype');
  return { v: 3, archetypeId, level: 55, name: '', notes: '', height: a.height_def, weight: a.weight_def, attributes: {...a.defaultAttributes}, skillMoves: a.skill_move, weakFoot: a.weak_foot, playstyles: [], specialization: null, facilities: [], budget: 2.5, includeAI: false, mastery: 0, masteryLevels: {}, masteryCustom: false };
}
export function attributeCost(archetypeId, key, from, to) {
  const id = key === 'skillMoves' ? 102 : key === 'weakFoot' ? 103 : DATA.attributes.find(a => a.key === key)?.id;
  if (id === undefined || !archetypeFor(archetypeId)) throw new Error('Unknown attribute or archetype');
  const curve = DATA.skillCurves[`${archetypeId}-${id}`] || DATA.attributeCurves[`${archetypeId}-${id}`] || 'STANDARD';
  let sum = 0;
  for (let v = from + 1; v <= to; v++) sum += DATA.curves.find(c => c.curveType === curve && v >= c.minValue && v <= c.maxValue)?.cost || 0;
  return sum;
}
export function requirementsFor(build, kind, id) {
  if (kind !== 'playstyle' && kind !== 'specialization') throw new Error('Unknown selection type');
  const rows = kind === 'playstyle' ? DATA.playstyleRequirements.filter(r => r.playstyleId === id) : DATA.specializationRequirements.filter(r => r.specId === id);
  return rows.map(r => ({key: attr[r.attributeId], requiredValue: r.requiredValue})).filter(r => r.key);
}
const weights = {
 pace: {acceleration:.45,sprintSpeed:.55}, shooting:{positioning:.05,finishing:.45,shotPower:.2,longShots:.2,volleys:.05,penalties:.05}, passing:{vision:.2,crossing:.2,fkAccuracy:.05,shortPassing:.35,longPassing:.15,curve:.05}, dribbling:{agility:.1,balance:.05,reactions:.05,ballControl:.3,dribbling:.45,composure:.05}, defending:{interceptions:.2,headingAccuracy:.1,defAwareness:.3,standTackle:.3,slideTackle:.1}, physical:{jumping:.05,stamina:.25,strength:.5,aggression:.2}, goalkeeper:{gkDiving:.2,gkHandling:.2,gkKicking:.2,gkReflexes:.2,gkPositioning:.2}
};
export function calculate(build, options = {}) {
 const a = archetypeFor(build?.archetypeId); if (!a) return {errors:['Unknown archetype']};
 const errors=[], bodyModifiers={},facilityModifiers={},masteryModifiers={};
 const integer = (v,min,max) => Number.isInteger(v) && v>=min && v<=max;
 if (!integer(build.level,1,55)) errors.push('Level must be between 1 and 55.');
 const level = integer(build.level,1,55) ? build.level : 1;
 if (!integer(build.height,a.height_min,a.height_max) || !integer(build.weight,a.weight_min,a.weight_max)) errors.push('Height or weight is outside this archetype’s range.');
 const attributes = {}; let spentAP = 0;
 for (const {key} of DATA.attributes) {
   const v=build.attributes?.[key], min=a.defaultAttributes[key], max=a.maxAttributes[key];
   if (min === undefined) continue;
   if (!integer(v,min,max)) errors.push(`Invalid ${key} rating.`);
   attributes[key]=Number.isFinite(v)?v:min;
   if(integer(v,min,max)) spentAP+=attributeCost(a.id,key,min,v);
 }
 for (const [key,min,max] of [['skillMoves',a.skill_move,a.skill_max],['weakFoot',a.weak_foot,a.weak_max]]) {
   if (!integer(build[key],min,max)) errors.push(`Invalid ${key} rating.`);
   else spentAP+=attributeCost(a.id,key,min,build[key]);
 }
 const totalAP=DATA.levelAP.slice(0,level).reduce((x,y)=>x+y,0), remainingAP=totalAP-spentAP;
 if (remainingAP<0) errors.push('Attribute point budget exceeded.');
 if(options.body!==false) for(const [id,value] of [[100,build.height-a.height_def],[101,build.weight-a.weight_def]]) {
   const band=DATA.bodyBands.find(b=>b.attributeId===id && value>=b.min && value<=b.max);
   if(band) for(const m of DATA.bodyModifiers.filter(m=>m.id===band.id && (a.position === 'GK' ? [0,1,6,29,30,32] : [0,1,2,3,4,6]).includes(m.attributeId))) add(bodyModifiers,m.attributeId,m.value);
 }
 let facilityCost=0; const facilityPlaystyles=[], seenFac=new Set();
 if (!Array.isArray(build.facilities)) errors.push('Invalid facilities.');
 for(const selection of Array.isArray(build.facilities)?build.facilities:[]) {
   const f=DATA.facilities.find(f=>f.id===selection.id);
   if(!f || !integer(selection.level,1,3) || seenFac.has(selection.id)) {errors.push('Invalid facility selection.');continue;}
   seenFac.add(selection.id); facilityCost+=f[`level_${selection.level}_cost`];
   if(options.facilities!==false && (!f.ai || build.includeAI)) {
    add(facilityModifiers,f.get_Attribute_1,f[`level${selection.level}_attr1_value`]);
    add(facilityModifiers,f.get_Attribute_2,f[`level${selection.level}_${selection.level===3?'attr3':'attr2'}_value`]);
   }
   if(selection.level===3 && (!f.ai || build.includeAI) && f.get_PlayStyle != null) facilityPlaystyles.push({id:f.get_PlayStyle,plus:false});
   if(selection.level===3 && (!f.ai || build.includeAI) && f.get_playstyle_plus != null) facilityPlaystyles.push({id:f.get_playstyle_plus,plus:true});
 }
 if(!DATA.budgets.some(option=>option.value===build.budget) || facilityCost>build.budget*1000000+1) errors.push('Facility budget exceeded or invalid.');
 if(!ranks.includes(build.mastery) || typeof build.masteryCustom!=='boolean' || !build.masteryLevels || typeof build.masteryLevels!=='object') errors.push('Invalid mastery settings.');
 if(options.mastery!==false) for(const m of DATA.masteries) {
   const other=archetypeFor(m.archetypeId); if(a.position!=='GK' && other.position==='GK') continue;
   const rank=build.masteryCustom ? build.masteryLevels?.[m.archetypeId]||0 : build.mastery;
   for(const threshold of [10,30,55]) if(rank>=threshold) m.attributeIds.forEach((id,i)=>add(masteryModifiers,id,m.bonuses[threshold][i]));
 }
 for(const [id,rank] of Object.entries(build.masteryLevels||{})) if(!archetypeFor(Number(id)) || !ranks.includes(rank)) errors.push('Invalid mastery level.');
 const finalAttributes=Object.fromEntries(Object.entries(attributes).map(([k,v])=>[k,Math.max(1,Math.min(99,v+(bodyModifiers[k]||0)+(facilityModifiers[k]||0)+(masteryModifiers[k]||0)))]));
 const slots=DATA.levelSlots[level-1], signature=[{id:a.def_playstyle_1,plus:DATA.signature1Plus[level-1]},{id:a.def_playstyle_2,plus:DATA.signature2Plus[level-1]}];
 if(build.specialization!=null){const spec=DATA.specializations.find(s=>s.id===build.specialization && s.archetypeId===a.id);if(!spec) errors.push('Invalid specialization.');else signature[1]={id:spec.sig_playstyle,plus:DATA.signature2Plus[level-1]};}
 if(!Array.isArray(build.playstyles)) errors.push('Invalid playstyles.');
 else {if(build.playstyles.length>slots || new Set(build.playstyles).size!==build.playstyles.length) errors.push('Invalid playstyle slots.'); for(const id of build.playstyles) { const style=DATA.playstyles.find(p=>p.id===id); if(!style) errors.push('Unknown playstyle.'); else if(a.position!=='GK' && style.category==='Goalkeeping') errors.push('Goalkeeper playstyle is unavailable for this archetype.'); if(signature.some(s=>s.id===id)) errors.push('A signature playstyle is already selected.'); }}
 for(const [kind,ids] of [['playstyle',Array.isArray(build.playstyles)?build.playstyles:[]],['specialization',build.specialization==null?[]:[build.specialization]]]) for(const id of ids) for(const req of requirementsFor(build,kind,id)) if(!Number.isFinite(attributes[req.key]) || attributes[req.key]<req.requiredValue) errors.push(`Requirements not met for ${kind} ${id}.`);
 const {agility,strength,acceleration}=finalAttributes;
 const accelerate=agility>=65 && agility-strength>=10 && acceleration>=80 && build.height<=182?'explosive':strength>=65 && strength-agility>=4 && acceleration>=40 && build.height>=185?'lengthy':'controlled';
 const categoryRatings=Object.fromEntries(Object.entries(weights).map(([category,w])=>[category,Math.round(Object.entries(category==='pace' && a.position==='GK' ? {acceleration:.6,sprintSpeed:.4} : w).reduce((sum,[k,v])=>sum+(finalAttributes[k]||0)*v,0))]));
 return {archetype:a,totalAP,spentAP,remainingAP,attributes,finalAttributes,bodyModifiers,facilityModifiers,masteryModifiers,facilityCost,slots,signature,facilityPlaystyles,accelerate,errors,categoryRatings};
}
export function applySelection(build,kind,id) {
 const next=clone(build), a=archetypeFor(build.archetypeId);
 if(kind==='playstyle') {if(!DATA.playstyles.some(p=>p.id===id)) throw new Error('Unknown playstyle'); if(!next.playstyles.includes(id)) next.playstyles.push(id);}
 else if(kind==='specialization') {if(!DATA.specializations.some(s=>s.id===id && s.archetypeId===a.id)) throw new Error('Unknown specialization');next.specialization=id;}
 else throw new Error('Unknown selection type');
 for(const {key,requiredValue} of requirementsFor(next,kind,id)) {if(!Number.isFinite(a.defaultAttributes[key]) || !Number.isFinite(a.maxAttributes[key]) || !Number.isFinite(next.attributes[key]) || requiredValue>a.maxAttributes[key]) throw new Error('Requirements exceed archetype maximum');next.attributes[key]=Math.max(next.attributes[key],requiredValue);}
 const result=calculate(next); if(result.errors.length) throw new Error(result.errors.join(' '));return next;
}
export function normalizeBuild(input) {
 if(!input || typeof input!=='object' || Array.isArray(input) || input.v!==3) throw new Error('Invalid build format');
 const defaults=makeBuild(input.archetypeId); const b=Object.fromEntries(Object.keys(defaults).map(key=>[key,clone(input[key] ?? defaults[key])])); if(typeof input.name!=='string' || input.name.length>100 || typeof input.notes!=='string' || input.notes.length>2000 || typeof input.includeAI!=='boolean') throw new Error('Invalid build details'); b.attributes=Object.fromEntries(Object.keys(defaults.attributes).map(key=>[key,input.attributes?.[key]])); b.facilities=Array.isArray(input.facilities) ? input.facilities.map(f=>({id:f.id,level:f.level})) : input.facilities;
 const result=calculate(b); if(result.errors.length) throw new Error(result.errors.join(' '));return b;
}






