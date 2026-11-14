import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launchBrowser} from './support/browser.mjs';
import {startTestServer} from './support/testServer.mjs';

test('pitch and shot controls fit desktop viewport together without cropping aim geometry',{timeout:35000},async()=>{
 const server=await startTestServer({penaltyHandler:async(req,res)=>{
  if(req.method==='GET')return res.json({configured:true,entries:[]});
  return res.json({token:'viewport-test',timingMode:'instant',shots:Array.from({length:10},()=>({keeperX:.2,keeperY:.5,saveRoll:.99}))});
 }});
 let browser;
 try{
  browser=await launchBrowser();const page=browser.page;
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('altair.penalty.playerId','Viewport-QA')"});
  for(const [width,height] of [[1920,900],[1536,760],[1366,650],[1280,720],[1024,768],[390,844]]){
   await page.setViewport(width,height);
   await page.navigate(`${server.baseUrl}/tr/penalti`);
   await page.waitFor("Boolean(document.querySelector('.pen-start-actions button'))");
   await page.click('.pen-start-actions button');
   await page.waitFor("Boolean(document.querySelector('.pen-aim-target'))");
   await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   const bounds=()=>page.evaluate(`(()=>{
    const area=document.querySelector('.pen-play-area').getBoundingClientRect();
    const svg=document.querySelector('.pen-stadium'),m=svg.getScreenCTM(),field=svg.getBoundingClientRect();
    const top=new DOMPoint(0,0).matrixTransform(m),bottom=new DOMPoint(1000,650).matrixTransform(m);
    return {top:area.top,bottom:area.bottom,viewport:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,cropped:top.y<field.top-.1||bottom.y>field.bottom+.1};
   })()`);
   let box=await bounds();assert.equal(box.overflow,false,`${width}: horizontal overflow`);assert.equal(box.cropped,false,`${width}: cropped SVG`);
   if(width>850){assert.ok(box.top>=80,JSON.stringify({width,...box}));assert.ok(box.bottom<=height-8,JSON.stringify({width,...box}));}
   await page.click('[data-shot-option="panenka"]');
   await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   box=await bounds();if(width>850)assert.ok(box.bottom<=height-8,`Panenka ${JSON.stringify({width,...box})}`);
   // Aim remains accurate when the SVG has horizontal letterboxing.
   const point=await page.evaluate("(()=>{const s=document.querySelector('.pen-stadium');const p=new DOMPoint(640,250).matrixTransform(s.getScreenCTM());return {x:p.x,y:p.y}})()");
   await page.cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
   await page.cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
   await page.waitFor("Math.abs(document.querySelector('.pen-aim-target>g').transform.baseVal.getItem(0).matrix.e-640)<1");
   if([1920,1366,390].includes(width)){
    const shot=await page.cdp.send('Page.captureScreenshot',{format:'png'});
    await writeFile(`output/penalty-viewport-${width}.png`,Buffer.from(shot.data,'base64'));
   }
  }
 }finally{await browser?.close();await server.close();}
});
