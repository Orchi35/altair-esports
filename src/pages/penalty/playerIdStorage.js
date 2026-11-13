import {normalizePlayerId} from './playerId.js';

const STORAGE_KEY='altair.penalty.playerId';
const OWNER_KEY='altair.penalty.ownerToken';

// Keep a private browser capability, never a public ID, as proof of ownership.
// Require durable storage before claiming a name so it is not immediately lost.
export function getPlayerOwnerToken(storage,cryptoImpl=globalThis.crypto) {
 try {
  const target=storage??globalThis.localStorage;
  const existing=target.getItem(OWNER_KEY);
  if(typeof existing==='string'&&/^[a-f0-9]{64}$/.test(existing))return existing;
  const bytes=cryptoImpl.getRandomValues(new Uint8Array(32));
  const token=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
  target.setItem(OWNER_KEY,token);
  return target.getItem(OWNER_KEY)===token?token:'';
 }catch{return '';}
}

export function readPlayerId(storage) {
 try {return normalizePlayerId((storage??globalThis.localStorage)?.getItem(STORAGE_KEY));}
 catch {return '';}
}

export function rememberPlayerId(value,storage) {
 const id=normalizePlayerId(value);
 if(!id)return;
 try {(storage??globalThis.localStorage)?.setItem(STORAGE_KEY,id);}
 catch {/* Remembering the ID is optional; score submission must still succeed. */}
}
