// Public game ID only; this does not authenticate or reserve an account.
export function normalizePlayerId(value) {
  if(typeof value!=='string')return '';
  const id=value.normalize('NFC').trim();
  return id.length>=2 && id.length<=24 && /^[\p{L}\p{N}._-]+$/u.test(id) ? id : '';
}
