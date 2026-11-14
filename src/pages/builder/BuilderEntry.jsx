import {useEffect,useState} from 'react';
import BuilderPage from './BuilderPage.jsx';
import {ContentPage} from '../../components/layout/ContentPage.jsx';
import {getRoutePath} from '../../app/routes.js';
import {loadSharedBuild,shortBuildUrl} from './shareClient.js';

export default function BuilderEntry({locale='tr',shareId=null}){
 const tr=locale==='tr';
 const [loaded,setLoaded]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(shareId===null)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  let active=true;
  loadSharedBuild(shareId,controller.signal).then(build=>{if(active){setLoaded(build);setError('');}}).catch(err=>{if(active)setError(err.message);}).finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[shareId,retry]);
 if(shareId===null)return <BuilderPage locale={locale}/>;
 if(loaded)return <BuilderPage locale={locale} sharedBuild={loaded} sharedUrl={shortBuildUrl(shareId)}/>;
 return <ContentPage className="builder-page" breadcrumbLabel="FC27 Builder" breadcrumbs={[{label:tr?'Ana Sayfa':'Home',href:getRoutePath('home',locale)},{label:'FC27 Builder'}]} eyebrow="ALTAIR LAB / CLUBS" title={tr?'Paylaşılan build':'Shared build'}>
  <section className="builder-share-loading" aria-live="polite">
   <h2>{error?(tr?'Build açılamadı':'Build could not be opened'):(tr?'Build yükleniyor…':'Loading build…')}</h2>
   <p>{error?(error==='BUILD_NOT_FOUND'||error==='INVALID_SHARE_ID'?(tr?'Bu bağlantıya ait bir build bulunamadı.':'No build was found for this link.'):(tr?'Paylaşım servisine şu anda ulaşılamıyor. Tekrar deneyebilirsin.':'The sharing service is unavailable. Please try again.')):(tr?'Özellikler ve tüm seçimler hazırlanıyor.':'Preparing all attributes and selections.')}</p>
   {error&&<button onClick={()=>{setError('');setRetry(n=>n+1);}}>{tr?'Tekrar dene':'Retry'}</button>}
   <a href={getRoutePath('builder',locale)}>{tr?'Yeni build oluştur':'Create a new build'}</a>
  </section>
 </ContentPage>;
}
