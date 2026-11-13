import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleNetPaths} from '../src/pages/penalty/netMesh.js';
import {deformNetPoint,NET_SETTLE_MS} from '../src/pages/penalty/netMotion.js';

test('shared net vertices preserve every strand of the original deformation',()=>{
 const lines=[
  ...Array.from({length:37},(_,c)=>Array.from({length:15},(_,r)=>[250+c*500/36,180+r*177/14])),
  ...Array.from({length:15},(_,r)=>Array.from({length:37},(_,c)=>[250+c*500/36,180+r*177/14])),
 ];
 for(const targetX of [0,.25,.7,1])for(const targetY of [0,.4,1])for(const age of [0,16,120,550,1099,NET_SETTLE_MS]){
  const result={goal:true,targetX,targetY};
  const expected=lines.map(line=>line.map(([x,y],i)=>{
   const p=deformNetPoint(x,y,result,age);
   return `${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }).join(' '));
  assert.deepEqual(sampleNetPaths(result,age),expected);
 }
});

test('idle, missed and settled net reuse the same resting geometry',()=>{
 const resting=sampleNetPaths(null,0);
 assert.strictEqual(sampleNetPaths({goal:false},200),resting);
 assert.strictEqual(sampleNetPaths({goal:true,targetX:.4,targetY:.3},0),resting);
 assert.strictEqual(sampleNetPaths({goal:true,targetX:.4,targetY:.3},NET_SETTLE_MS),resting);
});
