import {useEffect,useId,useRef,useState} from 'react';
import {DATA,normalizeBuild} from './engine.js';
import {STORAGE_KEY} from './buildModel.js';
import './library.css';

const LIBRARY_KEY='altair.fc27.library.v1';
function readLibrary(){
 const raw=window.localStorage.getItem(LIBRARY_KEY);
 if(!raw)return [];
 const rows=JSON.parse(raw);
 if(!Array.isArray(rows))throw new Error('Invalid library');
 return rows.slice(0,30).flatMap(row=>{
  try{return typeof row.id==='string'&&Number.isFinite(new Date(row.updatedAt).getTime())?[{id:row.id,updatedAt:row.updatedAt,build:normalizeBuild(row.build)}]:[];}
  catch{return [];}
 });
}

export function BuildLibrary({build,onLoad,tr}){
 const [open,setOpen]=useState(false),[items,setItems]=useState([]),[status,setStatus]=useState('');
 const dialog=useRef(null),titleId=useId();
 useEffect(()=>{if(open&&!dialog.current.open)dialog.current.showModal();else if(!open&&dialog.current.open)dialog.current.close();},[open]);
 useEffect(()=>{if(!status||open)return;const timer=setTimeout(()=>setStatus(''),6000);return()=>clearTimeout(timer);},[status,open]);
 function openLibrary(){
  try{setItems(readLibrary());setStatus('');}
  catch{setItems([]);setStatus(tr?'Tarayıcı kayıtlarına erişilemiyor. Build’ini paylaşım bağlantısıyla saklayabilirsin.':'Browser storage is unavailable. Keep your build using its share link.');}
  setOpen(true);
 }
 function save(){
  try{
   const archetype=DATA.archetypes.find(a=>a.id===build.archetypeId);
   const saved=normalizeBuild({...build,name:build.name.trim()||`${archetype.name} · Lv. ${build.level}`});
   const library=readLibrary(),existing=library.find(row=>row.build.name===saved.name);
   if(!existing&&library.length>=30){setStatus(tr?'30 kayıt sınırına ulaştın. Build’lerim bölümünden bir kaydı kaldırabilirsin.':'Your library has 30 builds. Remove an entry from My builds to save another.');return;}
   const entry={id:existing?.id||crypto.randomUUID(),updatedAt:Date.now(),build:saved};
   const next=[entry,...library.filter(row=>row.id!==entry.id)];
   window.localStorage.setItem(LIBRARY_KEY,JSON.stringify(next));
   window.localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
   setItems(next);setStatus(tr?(existing?'Build kaydı güncellendi.':'Build bu tarayıcıya kaydedildi.'):(existing?'Saved build updated.':'Build saved in this browser.'));
  }catch{setStatus(tr?'Build kaydedilemedi. Paylaşım bağlantısıyla saklayabilirsin.':'Unable to save this build. Use a share link to keep it.');}
 }
 function remove(id){
  try{const next=items.filter(row=>row.id!==id);window.localStorage.setItem(LIBRARY_KEY,JSON.stringify(next));setItems(next);setStatus(tr?'Kayıt kaldırıldı.':'Saved build removed.');}
  catch{setStatus(tr?'Kayıt kaldırılamadı.':'Unable to remove this build.');}
 }
 function load(row){
  try{const candidate=normalizeBuild(row.build);if(onLoad(candidate)!==false){setOpen(false);setStatus(tr?'Kaydedilen build açıldı.':'Saved build loaded.');}}
  catch{setStatus(tr?'Bu kayıt açılamıyor.':'This saved build could not be loaded.');}
 }
 return <>
  <button onClick={openLibrary}>{tr?'Build’lerim':'My builds'}</button>
  <button onClick={save}>{tr?'Kaydet':'Save'}</button>
  {!open&&status&&<span className="builder-library-status" role="status">{status}</span>}
  <dialog ref={dialog} className="builder-library-dialog" aria-labelledby={titleId} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false);}}}>
   <header><div><h2 id={titleId}>{tr?'Build’lerim':'My builds'}</h2><p>{tr?'Bu tarayıcıdaki kayıtların':'Saved in this browser'} · {items.length}/30</p></div><button aria-label={tr?'Kapat':'Close'} onClick={()=>setOpen(false)}>×</button></header>
   {status&&<p className="builder-library-message" role="status">{status}</p>}
   <div className="builder-library-list">
    {!items.length&&<p className="builder-library-empty">{tr?'Henüz kayıt yok. Oyuncunu oluşturup Kaydet’e bas.':'No saved builds yet. Create your player and choose Save.'}</p>}
    {items.map(row=>{const a=DATA.archetypes.find(a=>a.id===row.build.archetypeId);return <article key={row.id}><img src={a.image} width="48" height="56" alt=""/><div><h3>{row.build.name||a.name}</h3><p>{a.name} · Lv. {row.build.level}</p><time dateTime={new Date(row.updatedAt).toISOString()}>{new Date(row.updatedAt).toLocaleDateString(tr?'tr-TR':'en-GB')}</time></div><div className="builder-library-actions"><button onClick={()=>load(row)}>{tr?'Aç':'Load'}</button><button className="builder-library-remove" aria-label={`${row.build.name} ${tr?'kaldır':'remove'}`} onClick={()=>remove(row.id)}>{tr?'Kaldır':'Remove'}</button></div></article>;})}
   </div>
   <footer>{tr?'Aynı adla kaydetmek mevcut kaydı günceller. Başka cihazda açmak için paylaşım bağlantısını kullan.':'Saving with the same name updates that entry. Use a share link to open a build on another device.'}</footer>
  </dialog>
 </>;
}
