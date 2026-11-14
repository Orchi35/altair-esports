import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launchBrowser} from './support/browser.mjs';
import {startTestServer} from './support/testServer.mjs';

test('goal targeting supports pointer drag, keyboard and mobile touch',{timeout:30000},async()=>{
 const server=await startTestServer({penaltyHandler:async(req,res)=>{
  if(req.method==='GET')return res.json({configured:true,entries:[]});
  return res.json({token:'aim-test',timingMode:'instant',shots:Array.from({length:10},()=>({keeperX:.2,keeperY:.5,saveRoll:.99}))});
 }});
 let browser;
 try{
  browser=await launchBrowser();const page=browser.page;
  await page.setViewport(1440,1100);
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('altair.penalty.playerId','Aim-QA')"});
  await page.navigate(`${server.baseUrl}/tr/penalti`);
  await page.waitFor("Boolean(document.querySelector('.pen-start-actions button'))");
  await page.click('.pen-start-actions button');
  await page.waitFor("Boolean(document.querySelector('.pen-aim-target'))");
  const screen=async(x,y)=>page.evaluate(`(()=>{const s=document.querySelector('.pen-stadium');s.scrollIntoView({block:'center',behavior:'instant'});const p=new DOMPoint(${220+x*560},${145+y*235}).matrixTransform(s.getScreenCTM());return {x:p.x,y:p.y};})()`);
  const target=()=>page.evaluate("document.querySelector('.pen-aim-target>g').getAttribute('transform')");
  const initial=await screen(.25,.35),end=await screen(.8,.3);
  await page.cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...initial});
  await page.cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,...end});
  await page.cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...end});
  await page.waitFor("Math.abs(document.querySelector('.pen-aim-target>g').transform.baseVal.getItem(0).matrix.e-668)<.1");
  await page.focus('.pen-stadium');await page.press('ArrowLeft');
  assert.ok(Math.abs(await page.evaluate("document.querySelector('.pen-aim-target>g').transform.baseVal.getItem(0).matrix.e")-645.6)<.1,await target());
  await page.click('[data-shot-option="panenka"]');
  assert.equal(await page.evaluate("document.querySelector('.pen-aim-target text')===null"),true);
  const aimColor=await page.evaluate("document.querySelector('.pen-aim-brackets').getAttribute('stroke')");
  await page.evaluate("document.querySelector('.pen-stadium').scrollIntoView({block:'center',behavior:'instant'})");
  let shot=await page.cdp.send('Page.captureScreenshot',{format:'png'});
  await writeFile('output/penalty-aim-net-desktop.png',Buffer.from(shot.data,'base64'));
  await page.setViewport(390,844);
  await page.cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const edge=await screen(.01,.4);
  await page.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[edge]});
  await page.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitFor("Math.abs(document.querySelector('.pen-aim-target>g').transform.baseVal.getItem(0).matrix.e-225.6)<.1");
  assert.equal(await page.evaluate("document.querySelector('.pen-aim-brackets').getAttribute('stroke')"),aimColor);
  const center=await screen(.65,.5);
  await page.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center]});
  await page.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitFor("Math.abs(document.querySelector('.pen-aim-target>g').transform.baseVal.getItem(0).matrix.e-584)<.1");
  assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  shot=await page.cdp.send('Page.captureScreenshot',{format:'png'});
  await writeFile('output/penalty-aim-net-mobile.png',Buffer.from(shot.data,'base64'));
 }finally{await browser?.close();await server.close();}
});
