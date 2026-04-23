import { formatWon } from '../utils/format.js';

const WAITING_TEXT = '데이터연동대기';

export default function Hero({ lowestStation, dataMode, totalStationCount = 0 }) {
  const isReady = dataMode === 'opinet' && totalStationCount > 0 && lowestStation;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__copy">
        <div className="hero__eyebrow">지역별 최저가 주유소 조회</div>
        <h1 id="hero-title">오늘 가장 싼 주유소를<br />가볍게 찾아보세요.</h1>
        <p>유종과 지역을 선택해 가격이 낮은 주유소를 한눈에 비교해보세요.</p>
        <div className="hero__actions">
          <a className="primary-link" href="#finder">최저가 조회하기</a>
          <span className="hero-note">가격은 실제 판매 시점에 변동될 수 있습니다.</span>
        </div>
      </div>
      <aside className="hero-card" aria-label="서비스 요약">
        <div className="hero-card__top">
          <span className={`status-dot${isReady ? '' : ' is-waiting'}`}></span>
          <span>{isReady ? '데이터연동완료' : WAITING_TEXT}</span>
        </div>
        <strong className="hero-card__price">{lowestStation ? formatWon(lowestStation.price) : WAITING_TEXT}</strong>
        <p>{lowestStation ? lowestStation.name : WAITING_TEXT}</p>
        <div className="hero-card__meta" aria-label="데이터 상태">
          <span>데이터 상태</span>
          <strong>{isReady ? '완료' : WAITING_TEXT}</strong>
        </div>
      </aside>
    </section>
  );
}
