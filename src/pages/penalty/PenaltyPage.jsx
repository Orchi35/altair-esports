import {useCallback,useEffect,useRef,useState} from 'react';
import './penalty.css';
import Stadium from './Stadium.jsx';
import PowerMeter from './PowerMeter.jsx';
import {normalizePlayerId} from './playerId.js';
import {getPlayerOwnerToken,readPlayerId,rememberPlayerId} from './playerIdStorage.js';
import {calculateShot, powerFromMeter, PANENKA_LIMIT} from './shotModel.js';
import {createInstantSession,validShotPlan} from './instantSession.js';
import {createLocalShotClock} from './localShotClock.js';
import {getLeaguePlayerImage} from '../../features/squad/leaguePlayerImages.js';
const keepers = [
 {id:'893787',name:'mcb06099',number:'GK',skin:'#c79575',hair:'#262626',jersey:'#139a73'},
 {id:'927266',name:'Tru-Ardas',number:'GK',skin:'#c39a80',hair:'#8f939b',jersey:'#197f75'},
];
const empty={shot:0,total:0,results:[]};
// Retain native transport references; later console replacements cannot rewrite queued shots.
// This is defense in depth, not proof that a browser or player is trustworthy.
const request=globalThis.fetch.bind(globalThis),serialize=JSON.stringify;
async function api(body,period='week'){
 const response=await request(`/api/penalty?period=${period}`,body?{signal:AbortSignal.timeout(10000),method:'POST',headers:{'Content-Type':'application/json'},body:serialize(body)}:{signal:AbortSignal.timeout(10000)});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Service unavailable');
 return data;
}
export default function PenaltyPage({locale='tr'}){
 const tr=locale==='tr', [phase,setPhase]=useState('intro'),[aim,setAim]=useState({x:.76,y:.3}),[keeperId,setKeeperId]=useState(keepers[0].id),[game,setGame]=useState(empty),[mode,setMode]=useState('practice'),[flight,setFlight]=useState(null),[period,setPeriod]=useState('week'),[board,setBoard]=useState(null),[playerId,setPlayerId]=useState(()=>readPlayerId()),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[saved,setSaved]=useState(false),[best,setBest]=useState(()=>{try{return Number(localStorage.getItem('altair.penalty.best'))||0;}catch{return 0;}});
 const token=useRef(null),lock=useRef(false),meterClock=useRef(null),completedFlight=useRef(null),roundPlayerId=useRef(''),keeperRead=useRef(null);
 if(meterClock.current===null)meterClock.current=createLocalShotClock();
 const suppressReleaseClick=useRef(false);
 const pressedShotKey=useRef(null);
 const sync=useRef(null),shotPlan=useRef(null),roundOwner=useRef(null);
 useEffect(()=>()=>sync.current?.cancel(),[]);
 const [shotType,setShotType]=useState('normal'),[panenkasUsed,setPanenkasUsed]=useState(0);
 const [identityError,setIdentityError]=useState('');
 const [syncFailed,setSyncFailed]=useState(false);
 const playerIdInput=useRef(null);
 useEffect(()=>{if(identityError)playerIdInput.current?.focus();},[identityError]);
 const keeper=keepers.find(k=>k.id===keeperId)||keepers[0];
 const save=useCallback(async()=>{
  if(lock.current||saved||syncFailed||!token.current||!roundPlayerId.current)return;
  lock.current=true;setSaving(true);setNotice('');
  let flushed=false;
  try{
   const finalToken=await sync.current.flush();
   token.current=finalToken;flushed=true;
   await api({action:'submit',token:finalToken,playerId:roundPlayerId.current,ownerToken:roundOwner.current});
   setSaved(true);
   setNotice(tr?'Skorun otomatik kaydedildi. Sıralamada yalnızca en yüksek puanın tutulur.':'Score saved automatically. Only your highest score is kept on the leaderboard.');
  }catch{
   setSyncFailed(!flushed);
   setNotice(!flushed?(tr?'Şut kayıtları tamamlanamadı. Bu tur sıralamaya kaydedilemedi; yeni bir tur başlat.':'Shot records could not be completed. This round was not saved; start a new round.'):(tr?'Skor kaydı doğrulanamadı. Bağlantını kontrol edip tekrar dene.':'Score submission could not be confirmed. Check your connection and retry.'));
  }finally{lock.current=false;setSaving(false);}
 },[saved,syncFailed,tr]);
 const onFlightComplete=useCallback(()=>{
  if(!flight||completedFlight.current===flight)return;
  completedFlight.current=flight;
  setGame(g=>({shot:flight.shot,total:flight.total,results:[...g.results,flight.result.goal]}));
  setPhase(flight.finished?'done':'result');
  if(flight.finished&&mode==='practice'){setBest(b=>Math.max(b,flight.total));try{localStorage.setItem('altair.penalty.best',String(Math.max(best,flight.total)));}catch{/* Storage may be unavailable. */}}
  lock.current=false;
  if(flight.finished&&mode==='ranked')void save();
 },[flight,mode,best,save]);
 const prepareShot=useCallback(()=>{
  setFlight(null);setShotType('normal');setNotice('');lock.current=false;setPhase('aim');
 },[]);
 const onRecoveryComplete=useCallback(()=>prepareShot(),[prepareShot]);
 useEffect(()=>{let alive=true;api(null,period).then(data=>{if(alive)setBoard(data.entries);}).catch(()=>{if(alive)setBoard(null);});return()=>{alive=false;};},[period,saved]);
 async function start(){
  if(lock.current)return;
  const id=normalizePlayerId(playerId);
  if(!id){setIdentityError(tr?'Başlamak için 3–24 karakterlik oyuncu ID gir. Harf, rakam, nokta, alt çizgi veya tire kullan.':'Enter a player ID with 3–24 letters, numbers, dots, underscores or hyphens to start.');playerIdInput.current?.focus();return;}
  lock.current=true;setPhase('loading');setIdentityError('');setNotice('');setSyncFailed(false);
  sync.current?.cancel();sync.current=null;shotPlan.current=null;roundOwner.current=null;
  let sessionToken=null;
  try{
   const ownerToken=getPlayerOwnerToken();
   if(!ownerToken)throw new Error('IDENTITY_STORAGE_UNAVAILABLE');
   const data=await api({action:'start',playerId:id,ownerToken,timingMode:'instant'});
   if(data.timingMode!=='instant'||!data.token||!validShotPlan(data.shots))throw new Error('INSTANT_MODE_UNAVAILABLE');
   sessionToken=data.token;roundOwner.current=ownerToken;shotPlan.current=Object.freeze(data.shots.map(shot=>Object.freeze({...shot})));sync.current=createInstantSession(data.token,api,ownerToken);
  }catch(error){
   if(error.message==='RATE_LIMITED'){lock.current=false;setPhase('intro');setNotice(tr?'Çok sık deneme yapıldı. Bir süre bekleyip tekrar dene.':'Too many attempts. Wait a while before trying again.');return;}
   if(['PLAYER_ID_TAKEN','INVALID_PLAYER_ID','IDENTITY_REQUIRED','PLAYER_ID_MISMATCH'].includes(error.message)){
    setIdentityError(error.message==='PLAYER_ID_TAKEN'?(tr?'Bu oyuncu ID’si kullanımda. Daha önce kullandığın tarayıcıdan devam et veya farklı bir ID seç.':'This player ID is in use. Continue in your original browser or choose another ID.'):(tr?'Oyuncu ID doğrulanamadı. En az 3 karakterlik geçerli bir ID gir.':'Player ID could not be verified. Enter a valid ID of at least 3 characters.'));
    lock.current=false;setPhase('intro');playerIdInput.current?.focus();return;
   }
   setNotice(error.message==='IDENTITY_STORAGE_UNAVAILABLE'?(tr?'Tarayıcı depolaması kapalı. Antrenman oynayabilirsin; ID ayrılamaz ve skor sıralamaya kaydedilmez.':'Browser storage is unavailable. You can practice, but your ID cannot be reserved and scores will not enter the leaderboard.'):(tr?'Sıralama bağlantısı kurulamadı. Bu tur antrenmandır; skor sıralamaya kaydedilmez.':'Leaderboard connection is unavailable. This is a practice round; scores will not enter the leaderboard.'));
  }
  roundPlayerId.current=id;rememberPlayerId(id);setPlayerId(id);token.current=sessionToken;setMode(sessionToken?'ranked':'practice');
  completedFlight.current=null;keeperRead.current=null;setGame({...empty});setPanenkasUsed(0);setAim({x:.76,y:.3});setFlight(null);setSaved(false);prepareShot();
 }
 // Send at press, not release: holding a mouse/touch/Space must not move shot timing.
 // Retain trusted click activation for assistive technologies without a pointer event.
 function pressShot(event){
  if(event.nativeEvent?.isTrusted!==true||event.button!==0||!event.isPrimary)return;
  suppressReleaseClick.current=false;
  if(phase==='aim'&&!lock.current){suppressReleaseClick.current=true;void shoot(event);}
 }
 function keyShot(event){
  if(event.nativeEvent?.isTrusted!==true||event.nativeEvent.isComposing||!['Enter',' '].includes(event.key))return;
  if(event.repeat){event.preventDefault();return;}
  suppressReleaseClick.current=false;
  if(phase==='aim'){event.preventDefault();pressedShotKey.current=event.key;void shoot(event);}
 }
 function releaseShotKey(event){
  if(event.nativeEvent?.isTrusted===true&&event.key===pressedShotKey.current){
   event.preventDefault();pressedShotKey.current=null;
  }
 }
 function activateShot(event){
  // A long-held pointer may be released after the result is already displayed.
  // Its trailing click must not advance the round or submit another shot.
  if(suppressReleaseClick.current&&(event.detail>0||event.nativeEvent?.pointerType)){suppressReleaseClick.current=false;return;}
  if(phase==='aim')void shoot(event);
  else if(phase==='result')setPhase('recover');
  else if(phase==='done'||phase==='error')void start();
 }
 // Browser-generated activation only. This blocks DOM auto-clickers, not a modified client or direct API calls.
 function shoot(event){
  if(event?.nativeEvent?.isTrusted!==true||phase!=='aim'||lock.current)return;
  const sample=meterClock.current.sample(document.visibilityState==='visible');
  if(!sample.ok){
   setNotice(sample.reason==='clock'?(tr?'Cihazın zaman ölçümü değişti. Yeni bir tur başlat.':'Device timing changed. Start a new round.'):(tr?'Görüntü takıldığı için şut kullanılmadı. Gösterge akıcı olduğunda tekrar bas.':'The display stalled, so no shot was used. Press again when the meter is moving smoothly.'));
   return;
  }
  if(shotType==='panenka'&&panenkasUsed>=PANENKA_LIMIT)return;
  lock.current=true;setNotice('');
  // Sample the running local clock at press, not an old animation frame.
  const shotPosition=sample.meterPosition,shotPower=powerFromMeter(shotPosition,shotType);
  const random=shotPlan.current?.[game.shot]??{keeperX:.12+Math.random()*.76,keeperY:.15+Math.random()*.7,saveRoll:Math.random()};
  const result={...calculateShot({...aim,shotType,power:shotPower,...random,keeperRead:keeperRead.current}),power:shotPower,meterPosition:shotPosition};
  const used=panenkasUsed+(shotType==='panenka'?1:0);setPanenkasUsed(used);
  const next={result,panenkasUsed:used,total:game.total+result.points,shot:game.shot+1,finished:game.shot===9};
  keeperRead.current=result.keeperRead;
  setFlight({...next,x:aim.x,y:aim.y});setPhase('flight');
  sync.current?.enqueue({...aim,meterPosition:shotPosition,shotType},next);
 }

 const t=(a,b)=>tr?a:b;
 return <article className="pen-page"><header className="pen-heading"><div><span className="pen-eyebrow">ALTAIR / ARCADE 01</span><h1>Penalty <em>Arena.</em></h1><p>{t('On penaltı. Tek hedef: zirve.','Ten penalties. One goal: the top.')}</p></div><div className="pen-season"><span>● {t('GECE SEANSI','NIGHT SESSION')}</span><small>{t('Üyeliksiz oyna • Rekorunu geliştir','No account needed • Beat your best')}</small></div></header>
 <div className="pen-layout"><section className="pen-game" aria-label={t('Penaltı oyunu','Penalty game')}>
 <div className="pen-player-identity"><label htmlFor="pen-player-id">{t('Oyuncu ID','Player ID')}<input id="pen-player-id" ref={playerIdInput} name="playerId" value={playerId} onChange={e=>{setPlayerId(e.target.value);setIdentityError('');}} placeholder="ORC-HI" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="pen-player-id-help pen-player-id-error" aria-invalid={Boolean(identityError)} minLength={3} maxLength={24} required disabled={saving||!(phase==='intro'||phase==='error'||(phase==='done'&&(saved||mode==='practice')))}/></label><p id="pen-player-id-help">{t('3–24 karakterlik benzersiz bir ID seç. Bu tarayıcıda sana ayrılır; dereceli skorların otomatik kaydedilir. Başka birinin ID’sini kullanamazsın.','Choose a unique ID of 3–24 characters. It is reserved for this browser and ranked scores save automatically. You cannot use another player’s ID.')}</p><p id="pen-player-id-error" className="pen-identity-error" role="alert">{identityError}</p></div>
 <div className="pen-keeper-select" role="group" aria-label={t('Kaleci seç','Choose goalkeeper')}><div><span className="pen-eyebrow">{t('KALEDE KİM VAR?','WHO IS IN GOAL?')}</span><small>{t('Kalecini seç · Aynı zorluk','Choose your keeper · Equal difficulty')}</small></div><div className="pen-keeper-options">{keepers.map(k=><button key={k.id} className="pen-keeper-option" aria-pressed={keeperId===k.id} disabled={['loading','pending','flight','recover'].includes(phase)} onClick={()=>setKeeperId(k.id)}><img src={getLeaguePlayerImage('vpg',k.id)?.src} alt=""/><span><small>ALTAIR / GK</small><strong>{k.name}</strong></span><i aria-hidden="true">{keeperId===k.id?'✓':'+'}</i></button>)}</div></div>
 <div className={`pen-field ${phase==='flight'&&flight?.result.perfect?'is-perfect':''}`}><Stadium {...{aim,setAim,flight,phase,tr,keeper,shotType,onFlightComplete,onRecoveryComplete}}/><div className="pen-keeper-name"><span>GK</span> {keeper.name}</div>{phase==='flight'&&flight?.result.perfect&&<div className="pen-perfect" role="status"><span>✦</span><div><strong>{flight.result.shotType==='panenka'?'PANENKA ×2':t('KUSURSUZ VURUŞ','PERFECT STRIKE')}</strong><small>{t('TAM ZAMANLAMA · %100','PERFECT TIMING · 100%')}</small></div></div>}{phase==='intro'&&<div className="pen-overlay"><span className="pen-eyebrow">THE SPOTLIGHT IS YOURS</span><h2>{t('Sahne senin.','Your moment.')}</h2><p>{t('Kalede bir nokta seç. Gücü ayarla. İzini bırak.','Pick your spot. Time your power. Make it count.')}</p><div className="pen-start-actions"><button className="pen-primary" onClick={start}>{t('SAHAYA ÇIK','TAKE THE FIELD')} <span>↗</span></button><button type="button" className="pen-id-reminder" onClick={()=>playerIdInput.current?.focus()}><span aria-hidden="true">ID</span><span><strong>{normalizePlayerId(playerId)?t('Oyuncu ID','Player ID'):t('Önce oyuncu ID’ni gir','Enter your player ID first')}</strong><small>{normalizePlayerId(playerId)?playerId.trim():t('En az 3 karakter · Benzersiz isim','At least 3 characters · Unique name')}</small></span><span aria-hidden="true">↑</span></button></div><small>{t('Fare, dokunmatik veya yön tuşlarıyla oyna.','Play with mouse, touch or arrow keys.')}</small></div>}
 {(phase==='result'||phase==='done')&&<div className="pen-verdict" role="status"><strong>{flight?.result.goal?t('GOL!','GOAL!'):flight?.result.outcome==='post'?t(flight.result.postSide==='crossbar'?'ÜST DİREK!':'DİREK!','WOODWORK!'):flight?.result.outcome==='saved'?t('KURTARDI!','SAVED!'):flight?.result.outcome==='weak'?t('KISA KALDI!','TOO WEAK!'):t('DIŞARIDA!','WIDE!')}</strong><span>{flight?.result.goal?`+${flight.result.points} ${t('puan','points')}`:flight?.result.outcome==='post'?t('Top direkten geri döndü.','The ball bounced off the frame.'):flight?.result.outcome==='saved'?t(keeper.name+' topu çeldi.',keeper.name+' parried the shot.'):t('Göstergenin ortasını hedefle.','Aim for the center of the meter.')}</span></div>}
 {phase==='loading'&&<div className="pen-overlay"><h2>{t('Saha hazırlanıyor…','Preparing the pitch…')}</h2></div>}</div>
 <div className="pen-round-bar" aria-label={t('Tur ve puan','Round and score')}>
  <div className="pen-round-stats" role="status" aria-live="polite" aria-atomic="true"><div><small>{t('TUR','ROUND')}</small><strong>{phase==='intro'||phase==='loading'?0:['result','recover','done'].includes(phase)?game.shot:Math.min(game.shot+1,10)}<span> / 10</span></strong></div><div><small>{t('PUAN','SCORE')}</small><strong>{game.total}</strong></div></div>
  <div className="pen-shots" aria-label={t('Atış sonuçları','Shot results')}>{Array.from({length:10},(_,i)=><span key={i} className={game.results[i]===true?'goal':game.results[i]===false?'miss':''} aria-label={t('Şut ','Shot ')+(i+1)+': '+(game.results[i]===true?t('Gol','Goal'):game.results[i]===false?t('Gol değil','No goal'):t('Bekliyor','Pending'))}>{game.results[i]===true?'✓':game.results[i]===false?'×':'·'}</span>)}</div>
  <button type="button" className="pen-restart" onClick={start} disabled={saving||!['aim','result','error','done'].includes(phase)} title={t('Mevcut turu sıfırla ve 0 puanla yeniden başla','Reset the current round and start again with 0 points')}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.4 7.2M4 4v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{t('Yeniden Başlat','Restart')}</span></button>
 </div>
 <div className="pen-shot-picker">
  <div className="pen-shot-options" role="group" aria-label={t('Şut türü','Shot type')}>
   <button type="button" data-shot-option="normal" aria-pressed={shotType==='normal'} disabled={phase!=='aim'} onClick={()=>setShotType('normal')}><span>{t('Normal şut','Normal shot')}</span><small>{t('Klasik vuruş','Classic strike')}</small></button>
   <button type="button" data-shot-option="panenka" aria-pressed={shotType==='panenka'} disabled={phase!=='aim'||panenkasUsed>=PANENKA_LIMIT} onClick={()=>setShotType('panenka')}><span>Panenka <b>×2</b></span><small>{t('Kalan hak','Remaining')} <strong>{PANENKA_LIMIT-panenkasUsed}/{PANENKA_LIMIT}</strong></small></button>
  </div>
  <p id="pen-panenka-help">{shotType==='panenka'?t('Aşırtma vuruş · İki kat gol puanı. %100 alanı daha dar; %100’de kaleci kurtaramaz. Diğer vuruşlarda kurtarış riski daha yüksek.','Chip shot · Double goal points. A narrower perfect zone; the keeper cannot save 100% shots. Other shots carry a higher save risk.'):t('Her 10 şutluk turda 2 Panenka hakkın var. Gol olmasa da bir hak kullanılır.','You have 2 Panenka attempts per 10-shot round. An attempt is used even if it does not score.')}</p>
 </div>
 <div className="pen-controls"><PowerMeter {...{phase,meterClock,tr,shotType}} verifiedPower={flight?.result.power} verifiedPosition={flight?.result.meterPosition}/><button className="pen-primary" disabled={saving||!['aim','result','error','done'].includes(phase)} onPointerDown={pressShot} onKeyDown={keyShot} onKeyUp={releaseShotKey} onClick={activateShot}>{phase==='arming'?t('ŞUT HAZIRLANIYOR…','PREPARING SHOT…'):phase==='recover'?t('POZİSYONA DÖNÜYOR…','GETTING READY…'):phase==='result'?t('SONRAKİ ŞUT →','NEXT SHOT →'):phase==='done'||phase==='error'?t('TEKRAR OYNA ↗','PLAY AGAIN ↗'):t('ŞUT ÇEK →','SHOOT →')}</button></div>
 <div className="pen-aim-controls"><span>{t('Nişan','Aim')}</span><button disabled={phase!=='aim'} aria-label={t('Nişanı ayarla: yön tuşlarını kullan','Adjust aim using arrow keys')} onKeyDown={e=>{const delta={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.06],ArrowDown:[0,.06]}[e.key];if(delta){e.preventDefault();setAim(a=>({x:Math.max(0,Math.min(1,a.x+delta[0])),y:Math.max(0,Math.min(1,a.y+delta[1]))}));}}}>↑ ↓ ← →</button><small>{mode==='practice'?t('Antrenman • Bu cihazdaki rekor: ','Practice • Device best: ')+best:t('Anlık vuruş • Skor otomatik kaydedilir','Instant shots • Scores save automatically')}</small></div>
 {phase==='done'&&<div className="pen-finish"><div><small>{t('TUR TAMAMLANDI','ROUND COMPLETE')}</small><h2>{game.total} <span>{t('puan','points')}</span></h2><p>{game.results.filter(Boolean).length}/10 {t('gol','goals')}</p></div>{mode==='ranked'?<div className="pen-auto-save" role="status"><strong>{saving?t('SKORUN KAYDEDİLİYOR…','SAVING YOUR SCORE…'):saved?t('SKORUN KAYDEDİLDİ','SCORE SAVED'):t('KAYIT DOĞRULANAMADI','SAVE UNCONFIRMED')}</strong><p>{t('Her tur sonunda otomatik kaydedilir. Sıralamada yalnızca en yüksek puanın görünür.','Saved automatically at the end of each round. Only your highest score appears on the leaderboard.')}</p>{!saving&&!saved&&!syncFailed&&<button className="pen-primary" onClick={save}>{t('TEKRAR DENE','RETRY')}</button>}</div>:<p>{t('Bu turda sıralama bağlantısı kurulamadı. Antrenman skorun yalnızca bu cihazda tutulur.','The leaderboard connection was unavailable for this round. Practice scores stay on this device.')}</p>}</div>}
 <p className="pen-notice" role="status">{notice}</p></section>
 <aside className="pen-board"><div className="pen-board-heading"><span className="pen-eyebrow">HALL OF FAME</span><h2>{t('Liderlik tablosu','Leaderboard')} <span>↗</span></h2><p className="pen-id-help">{t('Her oyuncu ID’si için yalnızca en yüksek puan.','Only the best score for each player ID.')}</p></div><div className="pen-tabs">{['week','all'].map(p=><button key={p} aria-pressed={period===p} onClick={()=>setPeriod(p)}>{p==='week'?t('Bu hafta','This week'):t('Tüm zamanlar','All time')}</button>)}</div>{board?.length?<ol>{board.map((r,i)=><li key={`${r.playerId}-${i}`}><span>{String(i+1).padStart(2,'0')}</span><strong>{r.playerId}</strong><b>{r.score}</b></li>)}</ol>:<div className="pen-board-empty"><div>☆</div><h3>{board===null?t('Sıralama yakında','Coming soon'):t('İlk sırayı sen al.','Take the first spot.')}</h3><p>{board===null?t('Ortak sıralama hazırlanıyor. Şimdilik antrenman yap, kendi rekorunu geliştir.','The global leaderboard is being prepared. Practice and beat your own record.'):t('Henüz kayıtlı skor yok. Oyuncu ID’ni gir ve turunu tamamla; skorun otomatik kaydedilsin.','No scores yet. Enter your player ID and finish a round to save your score automatically.')}</p><span>{t('10 ŞUT / SINIRSIZ DENEME','10 SHOTS / UNLIMITED ROUNDS')}</span></div>}<div className="pen-rules"><h3>{t('Nasıl oynanır?','How to play')}</h3><p><b>01</b>{t('Kaleye dokunarak veya yön tuşlarını kullanarak hedefini seç.','Choose your target by tapping the goal or using the arrow keys.')}</p><p><b>02</b>{t('Gösterge ortadaki dar yeşil alana geldiğinde şut çek: %100 vuruşu yakala.','Shoot when the cursor reaches the narrow green center to hit 100% power.')}</p><p><b>03</b>{t('%100 vuruşla gol, 150 puan kazandırır. Vuruş yüzdesi düştükçe gol puanı azalır, kurtarış ihtimali artar. Aynı bölgeye art arda vurdukça kaleci o yönü öğrenir; köşe değiştirerek bu avantajı sıfırlayabilirsin. İki kaleci de aynı kuralları kullanır.','A goal at 100% power earns 150 points. Lower power earns fewer goal points and increases the chance of a save. Repeated shots in the same zone help the keeper read your aim; switch zones to reset this advantage. Both keepers follow the same rules.')}</p><p><b>04</b>{t('Panenka: turda 2 hak, iki kat gol puanı. %100 gol 300 puan. Daha dar tam zamanlama alanını yakalarsan kaleci kurtaramaz; direğe nişanlanan top yine direkten döner.','Panenka: 2 attempts per round, double goal points. A perfect goal earns 300 points. Hit the narrower perfect zone to beat the keeper; shots aimed at the frame still hit the woodwork.')}</p></div><div className="pen-brand"><img src="/logo-ui.png" alt=""/><span>BİRLİKTE OYNARIZ.<br/><strong>BİRLİKTE KAZANIRIZ.</strong></span></div></aside></div></article>;
}
