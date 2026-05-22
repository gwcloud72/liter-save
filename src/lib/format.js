export function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatNumber(value) {
  const number = toNumber(value);
  return number === null ? '-' : number.toLocaleString('ko-KR');
}

export function formatWon(value) {
  const number = toNumber(value);
  return number === null ? '-' : `${Math.round(number).toLocaleString('ko-KR')}원`;
}

export function formatSignedWon(value) {
  const number = toNumber(value);
  if (number === null) return '-';
  return `${number > 0 ? '+' : ''}${Math.round(number).toLocaleString('ko-KR')}원`;
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replace(/\.$/, '');
}

export function formatShortDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit' }).format(date).replace(/\.$/, '');
}

function hasFinalConsonant(text) {
  const chars = String(text || '').trim();
  if (!chars) return false;
  const code = chars.charCodeAt(chars.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

export function subjectParticle(text) {
  return hasFinalConsonant(text) ? '이' : '가';
}
