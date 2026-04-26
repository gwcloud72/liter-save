export function formatWon(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return '-';
  return `${price.toLocaleString('ko-KR')}원`;
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDistanceKm(value) {
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance < 0) return '-';
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  }
  return `${Math.round(distance)}km`;
}
