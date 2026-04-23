import { formatWon } from '../utils/format.js';
import { buildKakaoRouteUrl } from '../utils/mapLinks.js';

export default function StationCard({ station, rank, averagePrice }) {
  const price = Number(station.price || 0);
  const saving = Number(averagePrice || 0) - price;
  const savingText = saving >= 0
    ? `평균 대비 ${formatWon(saving)} 저렴`
    : `평균 대비 ${formatWon(Math.abs(saving))} 높음`;
  const address = station.roadAddress || station.address || '주소 정보 없음';
  const kakaoRouteUrl = buildKakaoRouteUrl(station);

  return (
    <article className="station-card">
      <span className="rank-badge">{rank}</span>
      <div className="station-card__content">
        <h3>{station.name}</h3>
        <div className="station-meta">
          <span>{station.brand || '브랜드 미상'}</span>
          <span>{address}</span>
        </div>
        <div className="station-card__actions">
          <a
            className="route-link"
            href={kakaoRouteUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${station.name} 카카오맵 길찾기`}
          >
            카카오맵 길찾기
          </a>
        </div>
      </div>
      <div className="price-block">
        <strong>{formatWon(station.price)}</strong>
        <small className={saving < 0 ? 'is-warning' : undefined}>{savingText}</small>
      </div>
    </article>
  );
}
