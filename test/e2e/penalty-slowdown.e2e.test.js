import test from 'node:test';
import assert from 'node:assert/strict';
import {launchBrowser} from './support/browser.mjs';
import {startTestServer} from './support/testServer.mjs';

test('freezing a perfect frame cannot shoot or consume a turn; recovery stays instant',{timeout:60000},async()=>{
 let shots=0;
 const server=await startTestServer({penaltyHandler:async(req,res)=>{
  if(req.method==='GET')return res.json({configured:true,entries:[]});
  const body=JSON.parse(req.body);
  if(body.action==='start')return res.json({token:'local-only',timingMode:'instant',shots:Array.from({length:10},()=>({keeperX:.2,keeperY:.5,saveRoll:.99}))});
  if(body.action==='shot'){shots++;return res.status(503).json({error:'LOCAL_TEST_OFFLINE'});}
  throw new Error('Unexpected fixture request');
 }});
 let browser;
 try{
  browser=await launchBrowser();const page=browser.page;
  await page.setViewport(1280,1000);
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`
   localStorage.setItem('altair.penalty.playerId','Slowdown-QA');
   window.__nativeRAF=requestAnimationFrame.bind(window);window.__frozen=false;window.__held=[];
   window.requestAnimationFrame=fn=>window.__nativeRAF(time=>{if(window.__frozen)window.__held.push(fn);else fn(time);});
  `});
  await page.navigate(`${server.baseUrl}/tr/penalti`);
  await page.waitFor("Boolean(document.querySelector('.pen-start-actions button'))");
  await page.click('.pen-start-actions button');
  await page.waitFor("document.querySelector('.pen-controls button')?.disabled===false");
  await page.evaluate(`(() => {
   const readout=document.querySelector('.pen-power strong');
   window.__observer=new MutationObserver(()=>{if(readout.textContent==='100%'){window.__frozen=true;window.__observer.disconnect();}});
   window.__observer.observe(readout,{childList:true,subtree:true,characterData:true});
  })()`);
  await page.waitFor('window.__frozen',{timeoutMs:10000});
  await page.evaluate('new Promise(resolve=>setTimeout(resolve,250))');
  await page.clickTrusted('.pen-controls button');
  assert.equal(shots,0,'a frozen perfect frame never sends a ranked shot');
  assert.match(await page.evaluate("document.querySelector('.pen-notice').textContent"),/şut kullanılmadı/);
  assert.equal(await page.evaluate("document.querySelector('.pen-controls button').textContent.includes('ŞUT ÇEK')"),true);
  assert.equal(await page.evaluate("Number(document.querySelectorAll('.pen-round-stats strong')[1].textContent)"),0);
  // Resume RAF without resetting the meter origin, then replace public clocks.
  await page.evaluate(`(() => {
   const now=performance.now.bind(performance),date=Date.now.bind(Date),p=now(),d=date();
   Object.defineProperty(performance,'now',{configurable:true,value:()=>p+(now()-p)/20});
   Date.now=()=>d+(date()-d)/20;
   window.__frozen=false;window.__held.splice(0).forEach(fn=>window.__nativeRAF(fn));
  })()`);
  await page.waitFor("document.querySelector('.pen-power strong').textContent!=='100%'");
  await page.clickTrusted('.pen-controls button');
  await page.waitFor("document.querySelector('.pen-power>div>span').textContent==='ŞUT SONUCU'");
  const deadline=Date.now()+2000;while(shots===0&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(shots,1,'the next valid press starts flight despite offline background write');
 }finally{await browser?.close();await server.close();}
});
