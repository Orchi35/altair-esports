import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBuild,encodeBuild,decodeBuild,loadInitialBuild} from '../src/pages/builder/buildModel.js';
test('shared build preserves Turkish text and all entered attributes',()=>{
 const build={...emptyBuild(),name:'Şener’in forveti ⚽',notes:'Çevik & güçlü',mastery:30,facilities:[{id:0,level:2}]};
 assert.deepEqual(decodeBuild(encodeBuild(build)),build);
});
test('corrupt and unsupported shared builds do not replace data with unchecked values',()=>{
 for(const value of ['%','x'.repeat(20001),encodeURIComponent(JSON.stringify({...emptyBuild(),v:99})),encodeURIComponent(JSON.stringify({...emptyBuild(),attributes:{finishing:120}}))]) assert.throws(()=>decodeBuild(value));
 assert.equal(loadInitialBuild('#build=%',{getItem:()=>JSON.stringify(emptyBuild())}).source,'invalid');
});
test('share takes precedence over local draft and storage is optional',()=>{
 const shared={...emptyBuild(),name:'Shared'};
 assert.equal(loadInitialBuild('#build='+encodeBuild(shared),{getItem:()=>{throw Error();}}).build.name,'Shared');
 assert.equal(loadInitialBuild('',{getItem:()=>{throw Error();}}).source,'new');
});
