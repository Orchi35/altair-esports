import test from 'node:test';
import assert from 'node:assert/strict';
import {launchBrowser} from './support/browser.mjs';
import {startTestServer} from './support/testServer.mjs';

// Isolated local practice fixture; never connects to the production score service.
test('meter, shot, net and keeper recovery remain responsive through a full round',async t=>{
 const server=await startTestServer();
 let browser;
 try{
  browser=await launchBrowser();
  const page=browser.page;
  await page.setViewport(1280,1000);
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('altair.penalty.playerId','Perf-QA'); Math.random=()=>0.999;"});
  await page.navigate(`${server.baseUrl}/tr/penalti`);
  await page.waitFor("Boolean(document.querySelector('.pen-start-actions button'))");
  await page.click('.pen-start-actions button');
  await page.waitFor("document.querySelector('.pen-controls button')?.disabled===false");
  assert.match(await page.evaluate("document.querySelector('.pen-aim-controls small').textContent"),/Antrenman/);
  await page.cdp.send('Performance.enable');
  const metrics=async()=>Object.fromEntries((await page.cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const before=await metrics();
  const samples=await page.evaluate(`new Promise(resolve=>{
   const values=[];let start;function frame(time){start??=time;values.push(Number(document.querySelector('.pen-meter').getAttribute('aria-valuenow')));if(time-start<2000)requestAnimationFrame(frame);else resolve(values)}requestAnimationFrame(frame);
  })`);
  const after=await metrics();
  assert.ok(new Set(samples).size>20,'meter keeps advancing');
  assert.ok(samples.every(n=>Number.isFinite(n)&&n>=0&&n<=100));
  t.diagnostic(JSON.stringify({aimScriptMs:+((after.ScriptDuration-before.ScriptDuration)*1000).toFixed(2),aimLayoutMs:+((after.LayoutDuration-before.LayoutDuration)*1000).toFixed(2),samples:samples.length}));
  for(let shot=1;shot<=10;shot++){
   await page.evaluate(`new Promise(resolve=>{function aim(){if(Number(document.querySelector('.pen-meter').getAttribute('aria-valuenow'))>=90)resolve(true);else requestAnimationFrame(aim)}requestAnimationFrame(aim)})`);
   await page.clickTrusted('.pen-controls button');
   await page.waitFor("Boolean(document.querySelector('.pen-verdict'))");
   const held=await page.evaluate("document.querySelector('.pen-meter-cursor').style.transform");
   await page.evaluate('new Promise(resolve=>setTimeout(resolve,100))');
   assert.equal(await page.evaluate("document.querySelector('.pen-meter-cursor').style.transform"),held,'meter stops during result');
   assert.equal(await page.evaluate("Number(document.querySelector('.pen-round-stats strong').firstChild.textContent)"),shot);
   if(shot<10){
    await page.click('.pen-controls button');
    await page.waitFor("document.querySelector('.pen-controls button')?.disabled===false && document.querySelector('.pen-controls button').textContent.includes('ŞUT ÇEK')");
   }
  }
  assert.ok(await page.evaluate("Boolean(document.querySelector('.pen-finish'))"));
  await page.click('.pen-restart');
  await page.waitFor("document.querySelector('.pen-controls button')?.disabled===false && !document.querySelector('.pen-finish')");
  await page.setReducedMotion(true);
  await page.clickTrusted('.pen-controls button');
  await page.waitFor("Boolean(document.querySelector('.pen-verdict'))");
  await page.click('.pen-controls button');
  await page.waitFor("document.querySelector('.pen-controls button')?.disabled===false && document.querySelector('.pen-controls button').textContent.includes('ŞUT ÇEK')");
 }finally{
  await browser?.close();
  await server.close();
 }
});
