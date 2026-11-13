import test from 'node:test';
import assert from 'node:assert/strict';
import {readPlayerId,rememberPlayerId,getPlayerOwnerToken} from '../src/pages/penalty/playerIdStorage.js';

function memoryStorage(){
 const values=new Map();
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}

test('player ID survives a fresh read and can be replaced',()=>{
 const storage=memoryStorage();
 assert.equal(readPlayerId(storage),'');
 rememberPlayerId(' ORC-HI ',storage);
 assert.equal(readPlayerId(storage),'ORC-HI');
 rememberPlayerId('Tru-Ardas',storage);
 assert.equal(readPlayerId(storage),'Tru-Ardas');
 rememberPlayerId('invalid id',storage);
 assert.equal(readPlayerId(storage),'Tru-Ardas');
});

test('corrupt or blocked storage does not prevent play or score saving',()=>{
 assert.equal(readPlayerId({getItem:()=>'<invalid>'}),'');
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
 assert.equal(readPlayerId(blocked),'');
 assert.doesNotThrow(()=>rememberPlayerId('ORC-HI',blocked));
});

test('owner token is generated securely, persisted, and reused',()=>{
 const storage=memoryStorage();
 const cryptoImpl={getRandomValues(bytes){bytes.fill(0xab);return bytes;}};
 const token=getPlayerOwnerToken(storage,cryptoImpl);
 assert.equal(token,'ab'.repeat(32));
 assert.equal(storage.getItem('altair.penalty.ownerToken'),token);
 assert.equal(getPlayerOwnerToken(storage,{getRandomValues(){throw Error('should reuse');}}),token);
 storage.setItem('altair.penalty.ownerToken','BAD');
 assert.equal(getPlayerOwnerToken(storage,cryptoImpl),token);
});

test('owner token is unavailable when storage is blocked',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
 assert.equal(getPlayerOwnerToken(blocked,{getRandomValues(bytes){bytes.fill(1);return bytes;}}),'');
 const writeBlocked={getItem(){return null;},setItem(){throw Error('quota');}};
 assert.equal(getPlayerOwnerToken(writeBlocked,{getRandomValues(bytes){bytes.fill(1);return bytes;}}),'');
});
