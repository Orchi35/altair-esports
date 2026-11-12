import {normalizePlayerId} from './playerId.js';

const STORAGE_KEY='altair.penalty.playerId';

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
