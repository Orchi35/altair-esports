// Public game ID only; this does not authenticate or reserve an account.
export function normalizePlayerId(value) {
  if(typeof value!=='string')return '';
  const id=value.normalize('NFC').trim();
  return id.length>=2 && id.length<=24 && /^[\p{L}\p{N}._-]+$/u.test(id) ? id : '';
}

// A public handle has one ranking entry regardless of casing or Unicode composition.
export function playerRankingKey(value) {
  return normalizePlayerId(value).toLocaleLowerCase('tr-TR').replaceAll('ı','i').normalize('NFC');
}
