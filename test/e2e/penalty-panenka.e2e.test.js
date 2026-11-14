import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launchBrowser} from './support/browser.mjs';
import {startTestServer} from './support/testServer.mjs';
import {calculateShot,powerFromMeter} from '../../src/pages/penalty/shotModel.js';

test('Panenka selector narrows timing, consumes two attempts and resets on restart',{timeout:45000},async()=>{
 const shots=Array.from({length:10},()=>({keeperX:.2,keeperY:.5,saveRoll:.99}));
 let count=0,total=0,used=0,read=null;
 const requests=[];
 const server=await startTestServer({penaltyHandler:async(req,res)=>{
  if(req.method==='GET')return res.json({configured:true,entries:[]});
  const b=JSON.parse(req.body);
  if(b.action==='start'){count=0;total=0;used=0;read=null;return res.json({token:'start',timingMode:'instant',shots});}
  assert.equal(b.action,'shot');requests.push(b);
  const power=powerFromMeter(b.meterPosition,b.shotType);
  const result={...calculateShot({...b,power,...shots[count],keeperRead:read}),power,meterPosition:b.meterPosition};
  read=result.keeperRead;total+=result.points;count++;if(b.shotType==='panenka')used++;
  return res.json({token:`shot-${count}`,shot:count,total,panenkasUsed:used,finished:count===10,result});
 }});
 let browser;
 try{
  browser=await launchBrowser();const page=browser.page;
  await page.setViewport(1280,1000);
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('altair.penalty.playerId','Panenka-QA')"});
  await page.navigate(`${server.baseUrl}/tr/penalti`);
  await page.waitFor("Boolean(document.querySelector('.pen-start-actions button'))");
  await page.click('.pen-start-actions button');
  const ready="document.querySelector('.pen-controls button')?.disabled===false && document.querySelector('.pen-controls button').textContent.includes('ŞUT ÇEK')";
  await page.waitFor(ready);
  const width=await page.evaluate("parseFloat(document.querySelector('.pen-sweet').style.width)");
  for(let i=0;i<2;i++){
   await page.click('[data-shot-option="panenka"]');
   assert.equal(await page.evaluate("parseFloat(document.querySelector('.pen-sweet').style.width)"),width/2);
   if(i===0){
    await page.setViewport(390,844);
    await page.evaluate("document.querySelector('.pen-shot-picker').scrollIntoView({block:'center',behavior:'instant'})");
    assert.equal(await page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true);
    const screenshot=await page.cdp.send('Page.captureScreenshot',{format:'png'});
    await writeFile('output/penalty-panenka-mobile.png',Buffer.from(screenshot.data,'base64'));
   }
   await page.waitFor("document.querySelector('.pen-power strong').textContent!=='0%'");
   await page.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
   await page.clickTrusted('.pen-controls button');
   await page.waitFor("document.querySelector('.pen-football').getAttribute('data-shot-type')==='panenka'").catch(async error=>{throw new Error(`${error.message} / ${await page.evaluate("document.querySelector('.pen-notice').textContent")}`);});
   assert.equal(await page.evaluate("document.querySelector('[data-shot-option=panenka] small').textContent"),`Kalan hak ${1-i}/2`);
   await page.waitFor("document.querySelector('.pen-controls button').textContent.includes('SONRAKİ ŞUT')");
   await page.click('.pen-controls button');await page.waitFor(ready);
   assert.equal(await page.evaluate("document.querySelector('[data-shot-option=normal]').getAttribute('aria-pressed')"),'true');
  }
  assert.equal(await page.evaluate("document.querySelector('[data-shot-option=panenka]').disabled"),true);
  await page.click('[data-shot-option="panenka"]');
  assert.equal(await page.evaluate("document.querySelector('[data-shot-option=normal]').getAttribute('aria-pressed')"),'true');
  await page.waitFor("document.querySelector('.pen-power strong').textContent!=='0%'");
  await page.clickTrusted('.pen-controls button');
  await page.waitFor("document.querySelector('.pen-controls button').textContent.includes('SONRAKİ ŞUT')");
  assert.deepEqual(requests.map(r=>r.shotType),['panenka','panenka','normal']);
  await page.click('.pen-restart');await page.waitFor(ready);
  assert.equal(await page.evaluate("document.querySelector('[data-shot-option=panenka]').disabled"),false);
  assert.equal(await page.evaluate("document.querySelector('[data-shot-option=panenka] small').textContent"),'Kalan hak 2/2');
 }finally{await browser?.close();await server.close();}
});
