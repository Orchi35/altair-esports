import test from 'node:test';
import assert from 'node:assert/strict';
import {launchBrowser} from './support/browser.mjs';
import {startTestServer} from './support/testServer.mjs';
import {calculateShot,powerFromMeter,powerPercentage} from '../../src/pages/penalty/shotModel.js';

// Local fixture only: no production leaderboard writes.
test('instant shots block DOM automation, respond to trusted presses and save in order',{timeout:60000},async t=>{
 const shots=Array.from({length:10},(_,i)=>({keeperX:.2+i*.02,keeperY:.5,saveRoll:.99}));
 const requests=[];
 let keeperRead=null,total=0,token='token-0',submitted=false,firstResponseSent=false,ownerToken;
 async function waitUntil(predicate){
  const deadline=Date.now()+10000;
  while(!predicate()){
   if(Date.now()>=deadline)throw new Error('Timed out waiting for local fixture');
   await new Promise(resolve=>setTimeout(resolve,50));
  }
 }
 const server=await startTestServer({penaltyHandler:async(req,res)=>{
  if(req.method==='GET')return res.json({configured:true,entries:[]});
  const body=JSON.parse(req.body);
  if(body.action==='start'){
   assert.equal(body.timingMode,'instant');ownerToken=body.ownerToken;
   return res.json({token,timingMode:'instant',shots});
  }
  if(body.action==='shot'){
   assert.deepEqual(Object.keys(body).sort(),['action','meterPosition','ownerToken','shotType','token','x','y']);
   assert.equal(body.token,token);assert.equal(body.ownerToken,ownerToken);
   const index=requests.length;requests.push(body);
   const power=powerFromMeter(body.meterPosition);
   const result={...calculateShot({x:body.x,y:body.y,power,...shots[index],keeperRead}),power,meterPosition:body.meterPosition};
   keeperRead=result.keeperRead;total+=result.points;token=`token-${index+1}`;
   if(index===0){await new Promise(resolve=>setTimeout(resolve,2200));firstResponseSent=true;}
   return res.json({token,result,total,panenkasUsed:0,shot:index+1,finished:index===9});
  }
  if(body.action==='submit'){
   assert.equal(requests.length,10);assert.equal(body.token,token);assert.equal(body.ownerToken,ownerToken);submitted=true;
   return res.json({submitted:true,entry:{playerId:body.playerId,score:total}});
  }
  throw new Error(`Unexpected action ${body.action}`);
 }});
 let browser;
 try{
  browser=await launchBrowser();const page=browser.page;
  await page.setViewport(1280,1000);
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('altair.penalty.playerId','Input-QA')"});
  await page.navigate(`${server.baseUrl}/tr/penalti`);
  await page.waitFor("Boolean(document.querySelector('.pen-start-actions button'))");
  await page.click('.pen-start-actions button');
  const ready="document.querySelector('.pen-controls button')?.disabled===false && document.querySelector('.pen-controls button').textContent.includes('ŞUT ÇEK')";
  await page.waitFor(ready);
  assert.match(await page.evaluate("document.querySelector('.pen-aim-controls small').textContent"),/Anlık vuruş/);
  // Console replacements and later storage edits must not rewrite an active round.
  await page.evaluate(`(() => {
   localStorage.setItem('altair.penalty.ownerToken','b'.repeat(64));
   const original=window.fetch;
   window.fetch=(input,...rest)=>{if(String(input).includes('/api/penalty'))throw new Error('console fetch replacement');return original(input,...rest);};
  })()`);

  await page.evaluate(`(() => {
   const live=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/^\\d+\\s*%$/.test(e.textContent.trim())).sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right)[0];
   if(!live)throw new Error('Live percent not found');window.__autoAttempts=0;
   window.__observer=new MutationObserver(()=>{if(parseInt(live.textContent)>=99){window.__autoAttempts++;document.querySelector('.pen-controls button')?.click();}});
   window.__observer.observe(live,{childList:true,characterData:true,subtree:true});
  })()`);
  await page.waitFor('window.__autoAttempts>=3',{timeoutMs:10000});
  await page.evaluate("window.__observer.disconnect(); const b=document.querySelector('.pen-controls button'); b.dispatchEvent(new MouseEvent('click',{bubbles:true})); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true})); b.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:' '})); b.click();");
  assert.equal(requests.length,0);assert.equal(await page.evaluate(ready),true);
  t.diagnostic('Blocked observer clicks and synthetic pointer, keyboard and click events.');
  for(let i=0;i<10;i++){
   await page.waitFor("document.querySelector('.pen-power strong').textContent!=='0%'");
   const input=['mouse','Enter','Space','touch'][i]||'mouse';
   let release;
   if(input==='mouse'){
    const point=await page.evaluate("(()=>{const e=document.querySelector('.pen-controls button');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    if(i===0){
     await page.cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'right',clickCount:1,...point});
     await page.cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'right',clickCount:1,...point});
     assert.equal(requests.length,0);
    }
    await page.cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    release=()=>page.cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
   }else if(input==='Enter'||input==='Space'){
    await page.focus('.pen-controls button');
    const key=input==='Space'?{key:' ',code:'Space',windowsVirtualKeyCode:32}:{key:'Enter',code:'Enter',windowsVirtualKeyCode:13};
    await page.cdp.send('Input.dispatchKeyEvent',{type:'rawKeyDown',...key});
    release=async()=>{await page.focus('.pen-controls button');await page.cdp.send('Input.dispatchKeyEvent',{type:'rawKeyDown',...key,autoRepeat:true});await page.cdp.send('Input.dispatchKeyEvent',{type:'keyUp',...key});};
   }else{
    await page.cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const point=await page.evaluate("(()=>{const e=document.querySelector('.pen-controls button');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await page.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    release=async()=>{await page.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});};
   }
   await page.waitFor("document.querySelector('.pen-power>div>span').textContent==='ŞUT SONUCU'",{timeoutMs:1200}).catch(async error=>{throw new Error(`${input} shot ${i}: ${await page.evaluate("document.querySelector('.pen-notice').textContent")} / ${error.message}`);});
   if(i===0)assert.equal(firstResponseSent,false,'flight begins before delayed server response');
   const frozen=await page.evaluate("({power:document.querySelector('.pen-meter').getAttribute('aria-valuenow'),position:parseFloat(document.querySelector('.pen-meter-cursor').style.transform.slice('translate3d('.length))/100})");
   await page.waitFor(i===9?"Boolean(document.querySelector('.pen-finish'))":"document.querySelector('.pen-controls button').textContent.includes('SONRAKİ ŞUT')");
   await release();
   if(i<9)assert.equal(await page.evaluate("document.querySelector('.pen-controls button').textContent.includes('SONRAKİ ŞUT')"),true,'release or repeat cannot advance');
   if(i===0){
    await waitUntil(()=>firstResponseSent);
    assert.deepEqual(await page.evaluate("({power:document.querySelector('.pen-meter').getAttribute('aria-valuenow'),position:parseFloat(document.querySelector('.pen-meter-cursor').style.transform.slice('translate3d('.length))/100})"),frozen,'delayed response leaves captured meter unchanged');
   }
   await waitUntil(()=>requests.length>i);
   assert.equal(frozen.power,String(powerPercentage(powerFromMeter(requests[i].meterPosition))));
   assert.ok(Math.abs(frozen.position-requests[i].meterPosition)<1e-6, 'CSS-serialized cursor matches submitted position');
   if(i<9){await page.click('.pen-controls button');await page.waitFor(ready);}
  }
  await page.waitFor("document.querySelector('.pen-auto-save strong')?.textContent.includes('SKORUN KAYDEDİLDİ')",{timeoutMs:10000});
  assert.equal(submitted,true);assert.equal(requests.length,10);
  assert.equal(await page.evaluate("Number(document.querySelector('.pen-finish h2').firstChild.textContent.trim())"),total);
 }finally{await browser?.close();await server.close();}
});
