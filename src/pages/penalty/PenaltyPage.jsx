import {useCallback,useEffect,useRef,useState} from 'react';
import './penalty.css';
import Stadium from './Stadium.jsx';
import PowerMeter from './PowerMeter.jsx';
import {normalizePlayerId} from './playerId.js';
import {getPlayerOwnerToken,readPlayerId,rememberPlayerId} from './playerIdStorage.js';
import {calculateShot, powerFromMeter} from './shotModel.js';
import {getLeaguePlayerImage} from '../../features/squad/leaguePlayerImages.js';
const keepers = [
 {id:'893787',name:'mcb06099',number:'GK',skin:'#c79575',hair:'#262626',jersey:'#139a73'},
 {id:'927266',name:'Tru-Ardas',number:'GK',skin:'#c39a80',hair:'#8f939b',jersey:'#197f75'},
];
const empty={shot:0,total:0,results:[]};
async function api(body,period='week'){
 const sentAt=performance.now();
 const response=await fetch(`/api/penalty?period=${period}`,body?{signal:AbortSignal.timeout(10000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{signal:AbortSignal.timeout(10000)});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Service unavailable');
 if(body?.action==='arm'){
  const receivedAt=performance.now();
  // Estimate transport only, excluding server processing. This estimate affects
  // the drawing, never server scoring; no client timestamp is sent with a shot.
  const transport=Math.min(500,Math.max(0,receivedAt-sentAt-(data.serverNow-data.requestReceivedAt)));
  data.timing={...data.timing,localStartsAt:receivedAt+data.timing.startsAt-data.serverNow-transport};
 }
 return data;
}
export default function PenaltyPage({locale='tr'}){
 const tr=locale==='tr', [phase,setPhase]=useState('intro'),[aim,setAim]=useState({x:.76,y:.3}),[keeperId,setKeeperId]=useState(keepers[0].id),[game,setGame]=useState(empty),[mode,setMode]=useState('practice'),[flight,setFlight]=useState(null),[period,setPeriod]=useState('week'),[board,setBoard]=useState(null),[playerId,setPlayerId]=useState(()=>readPlayerId()),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[saved,setSaved]=useState(false),[best,setBest]=useState(()=>{try{return Number(localStorage.getItem('altair.penalty.best'))||0;}catch{return 0;}});
 const token=useRef(null),lock=useRef(false),meterRef=useRef(0),completedFlight=useRef(null),roundPlayerId=useRef(''),keeperRead=useRef(null);
 const [identityError,setIdentityError]=useState('');
 const [timing,setTiming]=useState(null);
 const playerIdInput=useRef(null);
 useEffect(()=>{if(identityError)playerIdInput.current?.focus();},[identityError]);
 const keeper=keepers.find(k=>k.id===keeperId)||keepers[0];
 const save=useCallback(async()=>{
  if(lock.current||saved||!token.current||!roundPlayerId.current)return;
  lock.current=true;setSaving(true);setNotice('');
  try{
   await api({action:'submit',token:token.current,playerId:roundPlayerId.current});
   setSaved(true);
   setNotice(tr?'Skorun otomatik kaydedildi. Sıralamada yalnızca en yüksek puanın tutulur.':'Score saved automatically. Only your highest score is kept on the leaderboard.');
  }catch{
   setNotice(tr?'Skor kaydı doğrulanamadı. Bağlantını kontrol edip tekrar dene.':'Score submission could not be confirmed. Check your connection and retry.');
  }finally{lock.current=false;setSaving(false);}
 },[saved,tr]);
 const onFlightComplete=useCallback(()=>{
  if(!flight||completedFlight.current===flight)return;
  completedFlight.current=flight;
  setGame(g=>({shot:flight.shot,total:flight.total,results:[...g.results,flight.result.goal]}));
  setPhase(flight.finished?'done':'result');
  if(flight.finished&&mode==='practice'){setBest(b=>Math.max(b,flight.total));try{localStorage.setItem('altair.penalty.best',String(Math.max(best,flight.total)));}catch{/* Storage may be unavailable. */}}
  lock.current=false;
  if(flight.finished&&mode==='ranked')void save();
 },[flight,mode,best,save]);
 const prepareShot=useCallback(async(sessionToken)=>{
  setFlight(null);meterRef.current=0;setTiming(null);
  if(!sessionToken){lock.current=false;setPhase('aim');return;}
  lock.current=true;setPhase('arming');
  try{const data=await api({action:'arm',token:sessionToken});token.current=data.token;setTiming(data.timing);}
  catch{lock.current=false;setNotice(tr?'Şut doğrulanamadı. Başka bir sekmede tur açılmış veya oturum sona ermiş olabilir. Turu yeniden başlat.':'Shot could not be verified. A round may have started in another tab or the session expired. Restart the round.');setPhase('error');}
 },[tr]);
 const onRecoveryComplete=useCallback(()=>{void prepareShot(token.current);},[prepareShot]);
 useEffect(()=>{
  if(phase!=='arming'||!timing)return;
  const timer=setTimeout(()=>{lock.current=false;setPhase('aim');},Math.max(0,timing.localStartsAt-performance.now()+25));
  return()=>clearTimeout(timer);
 },[phase,timing]);
 useEffect(()=>{
  if(phase!=='aim'||!timing)return;
  const timer=setTimeout(()=>{setPhase('error');setNotice(tr?'Şut süresi doldu. Yeni bir tur başlat.':'Shot timed out. Start a new round.');},Math.max(0,timing.localStartsAt+timing.expiresAt-timing.startsAt-performance.now()));
  return()=>clearTimeout(timer);
 },[phase,timing,tr]);
 useEffect(()=>{let alive=true;api(null,period).then(data=>{if(alive)setBoard(data.entries);}).catch(()=>{if(alive)setBoard(null);});return()=>{alive=false;};},[period,saved]);
 async function start(){
  if(lock.current)return;
  const id=normalizePlayerId(playerId);
  if(!id){setIdentityError(tr?'Başlamak için 3–24 karakterlik oyuncu ID gir. Harf, rakam, nokta, alt çizgi veya tire kullan.':'Enter a player ID with 3–24 letters, numbers, dots, underscores or hyphens to start.');playerIdInput.current?.focus();return;}
  lock.current=true;setPhase('loading');setTiming(null);setIdentityError('');setNotice('');
  let sessionToken=null;
  try{
   const ownerToken=getPlayerOwnerToken();
   if(!ownerToken)throw new Error('IDENTITY_STORAGE_UNAVAILABLE');
   const data=await api({action:'start',playerId:id,ownerToken});
   sessionToken=data.token;
  }catch(error){
   if(error.message==='RATE_LIMITED'){lock.current=false;setPhase('intro');setNotice(tr?'Çok sık deneme yapıldı. Bir süre bekleyip tekrar dene.':'Too many attempts. Wait a while before trying again.');return;}
   if(['PLAYER_ID_TAKEN','INVALID_PLAYER_ID','IDENTITY_REQUIRED','PLAYER_ID_MISMATCH'].includes(error.message)){
    setIdentityError(error.message==='PLAYER_ID_TAKEN'?(tr?'Bu oyuncu ID’si kullanımda. Daha önce kullandığın tarayıcıdan devam et veya farklı bir ID seç.':'This player ID is in use. Continue in your original browser or choose another ID.'):(tr?'Oyuncu ID doğrulanamadı. En az 3 karakterlik geçerli bir ID gir.':'Player ID could not be verified. Enter a valid ID of at least 3 characters.'));
    lock.current=false;setPhase('intro');playerIdInput.current?.focus();return;
   }
   setNotice(error.message==='IDENTITY_STORAGE_UNAVAILABLE'?(tr?'Tarayıcı depolaması kapalı. Antrenman oynayabilirsin; ID ayrılamaz ve skor sıralamaya kaydedilmez.':'Browser storage is unavailable. You can practice, but your ID cannot be reserved and scores will not enter the leaderboard.'):(tr?'Sıralama bağlantısı kurulamadı. Bu tur antrenmandır; skor sıralamaya kaydedilmez.':'Leaderboard connection is unavailable. This is a practice round; scores will not enter the leaderboard.'));
  }
  roundPlayerId.current=id;rememberPlayerId(id);setPlayerId(id);token.current=sessionToken;setMode(sessionToken?'ranked':'practice');
  completedFlight.current=null;keeperRead.current=null;setGame({...empty});setAim({x:.76,y:.3});setFlight(null);setSaved(false);await prepareShot(sessionToken);
 }
 async function shoot(){if(phase!=='aim'||lock.current)return;lock.current=true;const shotPower=powerFromMeter(meterRef.current);setPhase('pending');let next;
 try{if(token.current){next=await api({action:'shot',token:token.current,...aim});token.current=next.token;}else{const result=calculateShot({...aim,power:shotPower,keeperX:.12+Math.random()*.76,keeperY:.15+Math.random()*.7,saveRoll:Math.random(),keeperRead:keeperRead.current});next={result,total:game.total+result.points,shot:game.shot+1,finished:game.shot===9};}
 keeperRead.current=next.result.keeperRead;const current={...next,x:aim.x,y:aim.y};setFlight(current);setPhase('flight');
 }catch{setNotice(tr?'Bağlantı kesildi. Dereceli turu yeniden başlat.':'Connection lost. Restart the ranked round.');setPhase('error');lock.current=false;}}

 const t=(a,b)=>tr?a:b;
 return <article className="pen-page"><header className="pen-heading"><div><span className="pen-eyebrow">ALTAIR / ARCADE 01</span><h1>Penalty <em>Arena.</em></h1><p>{t('On penaltı. Tek hedef: zirve.','Ten penalties. One goal: the top.')}</p></div><div className="pen-season"><span>● {t('GECE SEANSI','NIGHT SESSION')}</span><small>{t('Üyeliksiz oyna • Rekorunu geliştir','No account needed • Beat your best')}</small></div></header>
 <div className="pen-layout"><section className="pen-game" aria-label={t('Penaltı oyunu','Penalty game')}>
 <div className="pen-player-identity"><label htmlFor="pen-player-id">{t('Oyuncu ID','Player ID')}<input id="pen-player-id" ref={playerIdInput} name="playerId" value={playerId} onChange={e=>{setPlayerId(e.target.value);setIdentityError('');}} placeholder="ORC-HI" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="pen-player-id-help pen-player-id-error" aria-invalid={Boolean(identityError)} minLength={3} maxLength={24} required disabled={saving||!(phase==='intro'||phase==='error'||(phase==='done'&&(saved||mode==='practice')))}/></label><p id="pen-player-id-help">{t('3–24 karakterlik benzersiz bir ID seç. Bu tarayıcıda sana ayrılır; dereceli skorların otomatik kaydedilir. Başka birinin ID’sini kullanamazsın.','Choose a unique ID of 3–24 characters. It is reserved for this browser and ranked scores save automatically. You cannot use another player’s ID.')}</p><p id="pen-player-id-error" className="pen-identity-error" role="alert">{identityError}</p></div>
 <div className="pen-keeper-select" role="group" aria-label={t('Kaleci seç','Choose goalkeeper')}><div><span className="pen-eyebrow">{t('KALEDE KİM VAR?','WHO IS IN GOAL?')}</span><small>{t('Kalecini seç · Aynı zorluk','Choose your keeper · Equal difficulty')}</small></div><div className="pen-keeper-options">{keepers.map(k=><button key={k.id} className="pen-keeper-option" aria-pressed={keeperId===k.id} disabled={['loading','pending','flight','recover'].includes(phase)} onClick={()=>setKeeperId(k.id)}><img src={getLeaguePlayerImage('vpg',k.id)?.src} alt=""/><span><small>ALTAIR / GK</small><strong>{k.name}</strong></span><i aria-hidden="true">{keeperId===k.id?'✓':'+'}</i></button>)}</div></div>
 <div className={`pen-field ${phase==='flight'&&flight?.result.perfect?'is-perfect':''}`}><Stadium {...{aim,setAim,flight,phase,tr,keeper,onFlightComplete,onRecoveryComplete}}/><div className="pen-keeper-name"><span>GK</span> {keeper.name}</div>{phase==='flight'&&flight?.result.perfect&&<div className="pen-perfect" role="status"><span>✦</span><div><strong>{t('KUSURSUZ VURUŞ','PERFECT STRIKE')}</strong><small>{t('TAM ZAMANLAMA · %100','PERFECT TIMING · 100%')}</small></div></div>}{phase==='intro'&&<div className="pen-overlay"><span className="pen-eyebrow">THE SPOTLIGHT IS YOURS</span><h2>{t('Sahne senin.','Your moment.')}</h2><p>{t('Kalede bir nokta seç. Gücü ayarla. İzini bırak.','Pick your spot. Time your power. Make it count.')}</p><div className="pen-start-actions"><button className="pen-primary" onClick={start}>{t('SAHAYA ÇIK','TAKE THE FIELD')} <span>↗</span></button><button type="button" className="pen-id-reminder" onClick={()=>playerIdInput.current?.focus()}><span aria-hidden="true">ID</span><span><strong>{normalizePlayerId(playerId)?t('Oyuncu ID','Player ID'):t('Önce oyuncu ID’ni gir','Enter your player ID first')}</strong><small>{normalizePlayerId(playerId)?playerId.trim():t('En az 3 karakter · Benzersiz isim','At least 3 characters · Unique name')}</small></span><span aria-hidden="true">↑</span></button></div><small>{t('Fare, dokunmatik veya yön tuşlarıyla oyna.','Play with mouse, touch or arrow keys.')}</small></div>}
 {(phase==='result'||phase==='done')&&<div className="pen-verdict" role="status"><strong>{flight?.result.goal?t('GOL!','GOAL!'):flight?.result.outcome==='post'?t(flight.result.postSide==='crossbar'?'ÜST DİREK!':'DİREK!','WOODWORK!'):flight?.result.outcome==='saved'?t('KURTARDI!','SAVED!'):flight?.result.outcome==='weak'?t('KISA KALDI!','TOO WEAK!'):t('DIŞARIDA!','WIDE!')}</strong><span>{flight?.result.goal?`+${flight.result.points} ${t('puan','points')}`:flight?.result.outcome==='post'?t('Top direkten geri döndü.','The ball bounced off the frame.'):flight?.result.outcome==='saved'?t(keeper.name+' topu çeldi.',keeper.name+' parried the shot.'):t('Göstergenin ortasını hedefle.','Aim for the center of the meter.')}</span></div>}
 {phase==='loading'&&<div className="pen-overlay"><h2>{t('Saha hazırlanıyor…','Preparing the pitch…')}</h2></div>}</div>
 <div className="pen-round-bar" aria-label={t('Tur ve puan','Round and score')}>
  <div className="pen-round-stats" role="status" aria-live="polite" aria-atomic="true"><div><small>{t('TUR','ROUND')}</small><strong>{phase==='intro'||phase==='loading'?0:['result','recover','done'].includes(phase)?game.shot:Math.min(game.shot+1,10)}<span> / 10</span></strong></div><div><small>{t('PUAN','SCORE')}</small><strong>{game.total}</strong></div></div>
  <div className="pen-shots" aria-label={t('Atış sonuçları','Shot results')}>{Array.from({length:10},(_,i)=><span key={i} className={game.results[i]===true?'goal':game.results[i]===false?'miss':''} aria-label={t('Şut ','Shot ')+(i+1)+': '+(game.results[i]===true?t('Gol','Goal'):game.results[i]===false?t('Gol değil','No goal'):t('Bekliyor','Pending'))}>{game.results[i]===true?'✓':game.results[i]===false?'×':'·'}</span>)}</div>
  <button type="button" className="pen-restart" onClick={start} disabled={saving||!['aim','result','error','done'].includes(phase)} title={t('Mevcut turu sıfırla ve 0 puanla yeniden başla','Reset the current round and start again with 0 points')}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.4 7.2M4 4v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{t('Yeniden Başlat','Restart')}</span></button>
 </div>
 <div className="pen-controls"><PowerMeter {...{phase,meterRef,tr,timing}} verifiedPower={flight?.result.power}/><button className="pen-primary" disabled={saving||!['aim','result','error','done'].includes(phase)} onClick={()=>{if(phase==='aim')shoot();else if(phase==='result'){setPhase('recover');}else start();}}>{phase==='arming'?t('ŞUT HAZIRLANIYOR…','PREPARING SHOT…'):phase==='recover'?t('POZİSYONA DÖNÜYOR…','GETTING READY…'):phase==='result'?t('SONRAKİ ŞUT →','NEXT SHOT →'):phase==='done'||phase==='error'?t('TEKRAR OYNA ↗','PLAY AGAIN ↗'):t('ŞUT ÇEK →','SHOOT →')}</button></div>
 <div className="pen-aim-controls"><span>{t('Nişan','Aim')}</span><button disabled={phase!=='aim'} aria-label={t('Nişanı ayarla: yön tuşlarını kullan','Adjust aim using arrow keys')} onKeyDown={e=>{const delta={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.06],ArrowDown:[0,.06]}[e.key];if(delta){e.preventDefault();setAim(a=>({x:Math.max(0,Math.min(1,a.x+delta[0])),y:Math.max(0,Math.min(1,a.y+delta[1]))}));}}}>↑ ↓ ← →</button><small>{mode==='practice'?t('Antrenman • Bu cihazdaki rekor: ','Practice • Device best: ')+best:t('Dereceli tur • Sunucuda doğrulanır','Ranked round • Server verified')}</small></div>
 {phase==='done'&&<div className="pen-finish"><div><small>{t('TUR TAMAMLANDI','ROUND COMPLETE')}</small><h2>{game.total} <span>{t('puan','points')}</span></h2><p>{game.results.filter(Boolean).length}/10 {t('gol','goals')}</p></div>{mode==='ranked'?<div className="pen-auto-save" role="status"><strong>{saving?t('SKORUN KAYDEDİLİYOR…','SAVING YOUR SCORE…'):saved?t('SKORUN KAYDEDİLDİ','SCORE SAVED'):t('KAYIT DOĞRULANAMADI','SAVE UNCONFIRMED')}</strong><p>{t('Her tur sonunda otomatik kaydedilir. Sıralamada yalnızca en yüksek puanın görünür.','Saved automatically at the end of each round. Only your highest score appears on the leaderboard.')}</p>{!saving&&!saved&&<button className="pen-primary" onClick={save}>{t('TEKRAR DENE','RETRY')}</button>}</div>:<p>{t('Antrenman skorun yalnızca bu cihazda tutulur. Ortak sıralama henüz açılmadı.','Practice scores stay on this device. The global leaderboard is not open yet.')}</p>}</div>}
 <p className="pen-notice" role="status">{notice}</p></section>
 <aside className="pen-board"><div className="pen-board-heading"><span className="pen-eyebrow">HALL OF FAME</span><h2>{t('Liderlik tablosu','Leaderboard')} <span>↗</span></h2><p className="pen-id-help">{t('Her oyuncu ID’si için yalnızca en yüksek puan.','Only the best score for each player ID.')}</p></div><div className="pen-tabs">{['week','all'].map(p=><button key={p} aria-pressed={period===p} onClick={()=>setPeriod(p)}>{p==='week'?t('Bu hafta','This week'):t('Tüm zamanlar','All time')}</button>)}</div>{board?.length?<ol>{board.map((r,i)=><li key={`${r.playerId}-${i}`}><span>{String(i+1).padStart(2,'0')}</span><strong>{r.playerId}</strong><b>{r.score}</b></li>)}</ol>:<div className="pen-board-empty"><div>☆</div><h3>{board===null?t('Sıralama yakında','Coming soon'):t('İlk sırayı sen al.','Take the first spot.')}</h3><p>{board===null?t('Ortak sıralama hazırlanıyor. Şimdilik antrenman yap, kendi rekorunu geliştir.','The global leaderboard is being prepared. Practice and beat your own record.'):t('Henüz kayıtlı skor yok. Oyuncu ID’ni gir ve turunu tamamla; skorun otomatik kaydedilsin.','No scores yet. Enter your player ID and finish a round to save your score automatically.')}</p><span>{t('10 ŞUT / SINIRSIZ DENEME','10 SHOTS / UNLIMITED ROUNDS')}</span></div>}<div className="pen-rules"><h3>{t('Nasıl oynanır?','How to play')}</h3><p><b>01</b>{t('Kaleye dokunarak veya yön tuşlarını kullanarak hedefini seç.','Choose your target by tapping the goal or using the arrow keys.')}</p><p><b>02</b>{t('Gösterge ortadaki dar yeşil alana geldiğinde şut çek: %100 vuruşu yakala.','Shoot when the cursor reaches the narrow green center to hit 100% power.')}</p><p><b>03</b>{t('%100 vuruşla gol, 150 puan kazandırır. Vuruş yüzdesi düştükçe gol puanı azalır, kurtarış ihtimali artar. Aynı bölgeye art arda vurdukça kaleci o yönü öğrenir; köşe değiştirerek bu avantajı sıfırlayabilirsin. İki kaleci de aynı kuralları kullanır.','A goal at 100% power earns 150 points. Lower power earns fewer goal points and increases the chance of a save. Repeated shots in the same zone help the keeper read your aim; switch zones to reset this advantage. Both keepers follow the same rules.')}</p></div><div className="pen-brand"><img src="/logo-ui.png" alt=""/><span>BİRLİKTE OYNARIZ.<br/><strong>BİRLİKTE KAZANIRIZ.</strong></span></div></aside></div></article>;
}
