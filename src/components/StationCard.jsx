import { formatDistanceKm, formatWon } from '../utils/format.js';
import { buildKakaoRouteUrl } from '../utils/mapLinks.js';

export default function StationCard({ station, rank, averagePrice, sortMode }) {
  const saving = Number(averagePrice || 0) - Number(station.price || 0);
  const savingText = saving >= 0
    ? `목록 평균 대비 ${formatWon(saving)} 저렴`
    : `목록 평균 대비 ${formatWon(Math.abs(saving))} 높음`;
  const address = station.roadAddress || station.address || '주소 정보 없음';
  const kakaoRouteUrl = buildKakaoRouteUrl(station);
  const distanceText = Number.isFinite(Number(station.distanceKm))
    ? `현재 위치 ${formatDistanceKm(station.distanceKm)}`
    : null;
  const savingPerLiterText = Number.isFinite(Number(station.savingPerLiter)) && Number(station.savingPerLiter) > 0
    ? `리터당 ${formatWon(station.savingPerLiter)} 절약`
    : null;
  const expensivePerLiterText = Number.isFinite(Number(station.savingPerLiter)) && Number(station.savingPerLiter) < 0
    ? `리터당 ${formatWon(Math.abs(station.savingPerLiter))} 높음`
    : null;
  const expectedSavingsText = Number.isFinite(Number(station.expectedSavings40L)) && Number(station.expectedSavings40L) > 0
    ? `40L 기준 약 ${formatWon(station.expectedSavings40L)} 절약`
    : null;

  return (
    <article className="station-card">
      <span className="rank-badge">{rank}</span>
      <div className="station-card__content">
        <h3>{station.name}</h3>
        <div className="station-meta">
          <span>{station.brand || '브랜드 미상'}</span>
          <span>{address}</span>
        </div>
        <div className="station-insights" aria-label="주유소 비교 정보">
          {distanceText && <span className="station-insight">{distanceText}</span>}
          {savingPerLiterText && <span className="station-insight is-positive">{savingPerLiterText}</span>}
          {!savingPerLiterText && expensivePerLiterText && <span className="station-insight is-warning">{expensivePerLiterText}</span>}
          {expectedSavingsText && <span className="station-insight is-accent">{expectedSavingsText}</span>}
          {sortMode === 'value' && rank === 1 && <span className="station-insight is-accent">가성비 추천</span>}
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
