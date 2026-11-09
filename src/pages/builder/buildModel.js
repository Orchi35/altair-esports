import {makeBuild, normalizeBuild} from "./engine.js";
export const ARCHETYPES = ['Shot Stopper','Sweeper Keeper','Progressor','Boss','Marauder','Disruptor','Recycler','Maestro','Creator','Spark','Magician','Finisher','Target'];
export const POSITIONS = ['GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST'];
export const ATTRIBUTES = [
  ['acceleration','Hızlanma','Acceleration'],['sprintSpeed','Sprint hızı','Sprint speed'],
  ['finishing','Bitiricilik','Finishing'],['shotPower','Şut gücü','Shot power'],['longShots','Uzaktan şut','Long shots'],
  ['vision','Görüş','Vision'],['shortPassing','Kısa pas','Short passing'],['longPassing','Uzun pas','Long passing'],['crossing','Orta','Crossing'],
  ['agility','Çeviklik','Agility'],['balance','Denge','Balance'],['ballControl','Top kontrolü','Ball control'],['dribbling','Dripling','Dribbling'],['reactions','Reaksiyon','Reactions'],['composure','Soğukkanlılık','Composure'],
  ['interceptions','Top kesme','Interceptions'],['defAwareness','Defansif farkındalık','Defensive awareness'],['standTackle','Ayakta müdahale','Standing tackle'],['slideTackle','Kayarak müdahale','Sliding tackle'],['headingAccuracy','Kafa isabeti','Heading accuracy'],
  ['jumping','Zıplama','Jumping'],['stamina','Dayanıklılık','Stamina'],['strength','Güç','Strength'],['aggression','Agresiflik','Aggression'],
  ['gkDiving','Kaleci dalış','GK diving'],['gkHandling','Kaleci top tutma','GK handling'],['gkKicking','Kaleci vuruş','GK kicking'],['gkReflexes','Kaleci refleks','GK reflexes'],['gkPositioning','Kaleci pozisyon','GK positioning'],
  ['positioning','Hücum pozisyonu','Attacking positioning'],['volleys','Vole','Volleys'],['penalties','Penaltı','Penalties'],['fkAccuracy','Serbest vuruş','Free kick accuracy'],['curve','Falso','Curve'],
];
export const STORAGE_KEY = 'altair.fc27.build.v1';
export const GROUPS = [
 ['pace','Hız','Pace',['acceleration','sprintSpeed']],
 ['shooting','Şut','Shooting',['positioning','finishing','shotPower','longShots','volleys','penalties']],
 ['passing','Pas','Passing',['vision','crossing','fkAccuracy','shortPassing','longPassing','curve']],
 ['dribbling','Dripling','Dribbling',['agility','balance','reactions','ballControl','dribbling','composure']],
 ['defending','Savunma','Defending',['interceptions','headingAccuracy','defAwareness','standTackle','slideTackle']],
 ['physical','Fizik','Physical',['jumping','stamina','strength','aggression']],
 ['goalkeeper','Kalecilik','Goalkeeper',['gkDiving','gkHandling','gkKicking','gkReflexes','gkPositioning']],
];
export const emptyBuild = makeBuild;
export function attributeLabel(key,tr){const row=ATTRIBUTES.find(a=>a[0]===key);return row?row[tr?1:2]:key;}
export const validateBuild = normalizeBuild;
export function encodeBuild(build) { return encodeURIComponent(JSON.stringify(validateBuild(build))); }
export function decodeBuild(value) {
  if (!value || value.length > 20000) throw new Error('Invalid link');
  return validateBuild(JSON.parse(decodeURIComponent(value)));
}
export function loadInitialBuild(hash, storage) {
  if (hash.startsWith('#build=')) {
    try { return {build:decodeBuild(hash.slice(7)),source:'shared'}; } catch { return {build:emptyBuild(),source:'invalid'}; }
  }
  try { const saved=storage?.getItem(STORAGE_KEY); if(saved) return {build:validateBuild(JSON.parse(saved)),source:'saved'}; } catch { /* Storage may be unavailable. */ }
  return {build:emptyBuild(),source:'new'};
}
