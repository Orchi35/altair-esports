import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launchBrowser} from './support/browser.mjs';
import {startTestServer} from './support/testServer.mjs';
import {createBuilderHandler} from '../../server/builder/service.js';
import {makeBuild,normalizeBuild,applySelection,DATA} from '../../src/pages/builder/engine.js';
import {encodeBuild} from '../../src/pages/builder/buildModel.js';

test('short links restore complete builds independently and PNG card downloads on mobile',async()=>{
 const records=new Map();let unavailable=false;
 const handler=createBuilderHandler({env:{BUILDER_REDIS_REST_URL:'https://test.invalid',BUILDER_REDIS_REST_TOKEN:'local-test-only'},command:async([op,key,value])=>{
  if(unavailable)throw Error('test outage');
  if(op==='EVAL')return 0;
  if(op==='GET')return records.get(key)??null;
  if(op==='SET'){if(records.has(key))return null;records.set(key,value);return 'OK';}
  throw Error('Unexpected command');
 }});
 const server=await startTestServer({builderHandler:handler});let browser;
 let build=makeBuild();
 const spec=DATA.specializations.find(s=>s.archetypeId===build.archetypeId);
 build=applySelection(build,'specialization',spec.id);
 Object.assign(build,{name:'ALTAIR • Çevik Bitirici',notes:'Tek pas, hızlı yön değişimi.\nTakım oyunu ve dengeli fizik.',masteryCustom:true,masteryLevels:{3:30,12:55},facilities:[{id:0,level:2}]});
 try{
  browser=await launchBrowser();const page=browser.page;
  await page.setViewport(1440,1000);
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`
   const click=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download&&this.href.startsWith('blob:')){
     const filename=this.download;
     fetch(this.href).then(r=>r.blob()).then(blob=>{const reader=new FileReader();reader.onload=()=>{window.__export={filename,type:blob.type,data:reader.result};};reader.readAsDataURL(blob);});return;
    }
    return click.call(this);
   };
  `});
  await page.navigate(`${server.baseUrl}/tr/builder#build=${encodeBuild(build)}`);
  await page.waitFor("document.querySelector('.builder-toolbar input')?.value==='ALTAIR • Çevik Bitirici'");
  await page.click('.builder-toolbar .builder-primary');
  await page.waitFor("Boolean(document.querySelector('#builder-share-link'))");
  const link=await page.evaluate("document.querySelector('#builder-share-link').value");
  assert.match(link,/\/b\/[A-Za-z0-9_-]{12}$/);
  assert.ok(link.length<70);
  const id=link.split('/').at(-1);
  assert.deepEqual((await(await fetch(`${server.baseUrl}/api/builds?id=${id}`)).json()).build,normalizeBuild(build));
  await page.evaluate('localStorage.clear()');
  await page.setViewport(390,844);
  await page.navigate(link);
  await page.waitFor("document.querySelector('.builder-toolbar input')?.value==='ALTAIR • Çevik Bitirici'");
  assert.equal(await page.evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  await page.click('.builder-export');
  await page.waitFor('Boolean(window.__export?.data)',{timeoutMs:15000});
  const png=await page.evaluate('window.__export');
  assert.equal(png.type,'image/png');assert.match(png.filename,/^altair-fc27-.*\.png$/);
  const bytes=Buffer.from(png.data.split(',')[1],'base64');
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16),1600);assert.ok(bytes.readUInt32BE(20)>1500);
  await fs.mkdir('work/builder-qa',{recursive:true});await fs.writeFile('work/builder-qa/build-card-tr.png',bytes);
  await page.navigate(`${server.baseUrl}/en/builder#b=${id}`);
  await page.waitFor("document.querySelector('.builder-toolbar input')?.value==='ALTAIR • Çevik Bitirici'");
  assert.match(await page.evaluate("document.querySelector('.builder-export').textContent"),/Download/);
  await page.navigate(`${server.baseUrl}/b/doesnotexist`);
  await page.waitFor("Boolean(document.querySelector('.builder-share-loading button'))");
  assert.equal(await page.evaluate("Boolean(document.querySelector('.builder-toolbar'))"),false,'a missing link never silently opens a default build');
  unavailable=true;
  await page.navigate(`${server.baseUrl}/tr/builder`);
  await page.waitFor("Boolean(document.querySelector('.builder-toolbar'))");
  await page.click('.builder-toolbar .builder-primary');
  await page.waitFor("Boolean(document.querySelector('.builder-share-fallback'))");
  await page.click('.builder-share-fallback');
  await page.waitFor("document.querySelector('#builder-share-link')?.value.includes('#build=')");
 }catch(error){
  if(browser)error.message+=`\nPage: ${await browser.page.evaluate("JSON.stringify({url:location.href,text:document.body.innerText.slice(-2200)})")}`;
  throw error;
 }finally{await browser?.close();await server.close();}
});
