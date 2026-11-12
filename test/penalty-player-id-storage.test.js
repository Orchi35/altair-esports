import test from 'node:test';
import assert from 'node:assert/strict';
import {readPlayerId,rememberPlayerId} from '../src/pages/penalty/playerIdStorage.js';

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
