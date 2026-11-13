// Historical leaderboard rows can retain two-character IDs; new IDs require three.
export function normalizePlayerId(value,{minLength=3}={}) {
  if(typeof value!=='string')return '';
  const id=value.normalize('NFC').trim();
  const length=Array.from(id).length;
  return length>=minLength && length<=24 && /^[\p{L}\p{N}._-]+$/u.test(id) ? id : '';
}

// A public handle has one ranking entry regardless of casing or Unicode composition.
export function playerRankingKey(value) {
  return normalizePlayerId(value,{minLength:2}).toLocaleLowerCase('tr-TR').replaceAll('ı','i').normalize('NFC');
}
