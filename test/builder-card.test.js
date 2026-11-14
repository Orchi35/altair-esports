import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBuild } from '../src/pages/builder/engine.js';
import { renderBuildCard, wrapCardText } from '../src/pages/builder/buildCard.js';

test('card text wraps long words and preserves paragraph breaks', () => {
 const ctx={measureText:value=>({width:value.length})};
 assert.deepEqual(wrapCardText(ctx,'abcdefgh ij\nline',4),['abcd','efgh','ij','line']);
});

test('PNG card expands for notes and returns download metadata', async () => {
 const drawn=[];
 const ctx={measureText:value=>({width:value.length*12}),fillRect(){},strokeRect(){},fillText(value){drawn.push(String(value));},drawImage(){},createLinearGradient(){return {addColorStop(){}};}};
 const previousDocument=globalThis.document, previousWindow=globalThis.window, previousImage=globalThis.Image;
 globalThis.document={fonts:{ready:Promise.resolve()},createElement:()=>({width:0,height:0,getContext:()=>ctx,toBlob:callback=>callback(new Blob(['png'],{type:'image/png'}))})};
 globalThis.window={location:{href:'https://example.com/',origin:'https://example.com'}};
 globalThis.Image=class {set src(_value){this.onerror();}};
 try {
  const build=makeBuild(); build.name='Test build'; build.notes='long notes '.repeat(180).trim();
  const card=await renderBuildCard(build,{locale:'en'});
  assert.equal(card.width,1600); assert.ok(card.height>2000); assert.equal(card.blob.type,'image/png'); assert.equal(card.filename,'altair-fc27-test-build.png');
  assert.ok(drawn.includes('BASE = AP RATING   /   GAME = ALL BONUSES'));
  assert.ok(drawn.filter(value=>value.includes('long notes')).length>1);
  build.notes='\n'.repeat(2000);
  const blankCard=await renderBuildCard(build,{locale:'en'});
  assert.ok(blankCard.height<10000, 'blank paragraphs do not exceed canvas limits');
  build.masteryLevels={'12':30};
  await renderBuildCard(build,{locale:'en'});
  assert.ok(drawn.includes('SAVED CUSTOM LEVELS (INACTIVE)'));
 } finally {globalThis.document=previousDocument;globalThis.window=previousWindow;globalThis.Image=previousImage;}
});
