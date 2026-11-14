import test from 'node:test';
import assert from 'node:assert/strict';
import {launchBrowser} from './support/browser.mjs';
import {startTestServer} from './support/testServer.mjs';
import {calculateShot,powerFromMeter,powerPercentage} from '../../src/pages/penalty/shotModel.js';

// A local ranked-response fixture: no production names, scores or requests.
test('DOM auto-clicks send no shots; mouse, Enter, Space and touch still work',async t=>{
 const server=await startTestServer();
 let browser;
 try{
  browser=await launchBrowser();
  const page=browser.page;
  await page.setViewport(1280,1000);
  const results=[.5,.375,.55,.2].map(meterPosition=>{
   const power=powerFromMeter(meterPosition);
   return {...calculateShot({x:.7,y:.3,power,keeperX:.2,keeperY:.5,saveRoll:.99}),power,meterPosition};
  });
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`
   localStorage.setItem('altair.penalty.playerId','Input-QA');
   window.__shotRequests=0;
   window.__autoAttempts=0;
   const originalFetch=window.fetch.bind(window);
   window.fetch=async (input,options)=>{
    if(new URL(input,location.href).pathname!=='/api/penalty')return originalFetch(input,options);
    const body=options?.body?JSON.parse(options.body):{};
    const requestReceivedAt=Date.now();
    let data={configured:true,entries:[]};
    if(body.action==='start')data={token:'local-test-token'};
    if(body.action==='arm'){
     const now=Date.now();data={token:'local-test-token',serverNow:now,requestReceivedAt:now,timing:{startsAt:now+150,expiresAt:now+30150,legMs:620}};
    }
    if(body.action==='shot'){
     window.__shotRequests++;
     window.__shotKeys=Object.keys(body).sort();
     const result=${JSON.stringify(results)}[window.__shotRequests-1];
     await new Promise(resolve=>setTimeout(resolve,350));
     data={token:'local-test-token',result,total:result.points,shot:1,finished:false};
    }
    if(['start','arm','shot'].includes(body.action))data={...data,requestReceivedAt,serverNow:Date.now()};
    return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
   };
  `});
  await page.navigate(`${server.baseUrl}/tr/penalti`);
  await page.waitFor("Boolean(document.querySelector('.pen-start-actions button'))");
  await page.click('.pen-start-actions button');
  const ready="document.querySelector('.pen-controls button')?.disabled===false && document.querySelector('.pen-controls button').textContent.includes('ŞUT ÇEK')";
  await page.waitFor(ready);
  assert.match(await page.evaluate("document.querySelector('.pen-aim-controls small').textContent"),/Dereceli/);

  // Reproduce the supplied observer using the actual visible percent element.
  await page.evaluate(`(() => {
   const live=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/^\\d+\\s*%$/.test(e.textContent.trim())).sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right)[0];
   if(!live)throw new Error('Live percent not found');
   window.__observer=new MutationObserver(()=>{
    if(parseInt(live.textContent)>=99){window.__autoAttempts++;[...document.querySelectorAll('button')].find(b=>b.textContent.includes('ŞUT ÇEK'))?.click();}
   });
   window.__observer.observe(live,{childList:true,characterData:true,subtree:true});
  })()`);
  await page.waitFor('window.__autoAttempts>=3',{timeoutMs:10000});
  await page.evaluate("window.__observer.disconnect(); const button=document.querySelector('.pen-controls button'); button.dispatchEvent(new MouseEvent('click',{bubbles:true})); button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true})); button.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:' '})); button.click();");
  assert.equal(await page.evaluate('window.__shotRequests'),0);
  assert.equal(await page.evaluate(ready),true,'synthetic input must not lock the round');
  t.diagnostic(`Blocked ${await page.evaluate('window.__autoAttempts')} threshold auto-clicks plus synthetic click/dispatchEvent; zero shot requests.`);

  for(const input of ['mouse','Enter','Space','touch']){
   if(input!=='mouse'){
    await page.click('.pen-restart');
    await page.waitFor(ready);
   }
   const before=await page.evaluate('window.__shotRequests');
   let release;
   if(input==='mouse'){
    const point=await page.evaluate("(()=>{const e=document.querySelector('.pen-controls button');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await page.cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'right',clickCount:1,...point});
    await page.cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'right',clickCount:1,...point});
    assert.equal(await page.evaluate('window.__shotRequests'),before,'secondary mouse button cannot shoot');
    await page.cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    release=()=>page.cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
   }else if(input==='Space'||input==='Enter'){
    await page.focus('.pen-controls button');
    const key=input==='Space'?{key:' ',code:'Space',windowsVirtualKeyCode:32}:{key:'Enter',code:'Enter',windowsVirtualKeyCode:13};
    await page.cdp.send('Input.dispatchKeyEvent',{type:'rawKeyDown',...key});
    release=async()=>{
     // Disabled buttons may lose focus during flight. Exercise the actual
     // repeat/keyup handlers after the result, rather than dispatching to body.
     await page.focus('.pen-controls button');
     await page.cdp.send('Input.dispatchKeyEvent',{type:'rawKeyDown',...key,autoRepeat:true});
     await page.cdp.send('Input.dispatchKeyEvent',{type:'keyUp',...key});
    };
   }else{
    await page.cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const point=await page.evaluate("(()=>{const e=document.querySelector('.pen-controls button');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await page.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    release=()=>page.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   await page.waitFor(`window.__shotRequests===${before+1}`,{timeoutMs:1500});
   assert.equal(await page.evaluate('window.__shotRequests'),before+1,`${input} shoots on press before release`);
   // Hold through the response/animation: release or a repeat must not advance.
   await page.waitFor("document.querySelector('.pen-controls button').textContent.includes('SONRAKİ ŞUT')");
   await release();
   assert.equal(await page.evaluate("document.querySelector('.pen-controls button').textContent.includes('SONRAKİ ŞUT')"),true,'release/repeat cannot advance the completed shot');
   await page.waitFor('Boolean(document.querySelector(".pen-verdict"))');
   assert.equal(await page.evaluate('window.__shotRequests'),before+1,`${input} sends exactly one shot`);
   assert.deepEqual(await page.evaluate('window.__shotKeys'),['action','token','x','y'],'calibration never sends client power, timestamps or latency');
   const expected=results[before];
   assert.equal(await page.evaluate("document.querySelector('.pen-meter').getAttribute('aria-valuenow')"),String(powerPercentage(expected.power)),'server result remains authoritative');
   const position=await page.evaluate("parseFloat(document.querySelector('.pen-meter-cursor').style.transform.slice('translate3d('.length))/100");
   assert.ok(Math.abs(position-expected.meterPosition)<1e-8,'result cursor agrees with server power even after delayed response');
   assert.equal(await page.evaluate("Number(document.querySelectorAll('.pen-round-stats strong')[1].textContent)"),expected.points);
   assert.equal(await page.evaluate("document.querySelector('.pen-power>div>span').textContent"),'DOĞRULANAN ŞUT');
   if(input==='Space'){
    await page.focus('.pen-controls button');
    await page.press('Enter');
    await page.waitFor(ready);
    assert.equal(await page.evaluate('window.__shotRequests'),before+1,'fresh keyboard activation advances without an extra shot');
   }
  }
 }finally{
  await browser?.close();
  await server.close();
 }
});
