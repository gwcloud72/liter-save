import { formatDate, formatWon } from '../utils/format.js';

const WAITING_TEXT = '데이터연동대기';

function getStatusLabel(ready, provider) {
  if (!ready) return WAITING_TEXT;
  if (provider === 'google') return '자동 리포트 생성 완료';
  return '리포트 생성 완료';
}

function getMetricText(value) {
  return Number.isFinite(Number(value)) ? formatWon(value) : WAITING_TEXT;
}

export default function MarketReportCard({ payload, dataStatus }) {
  const report = payload?.report ?? null;
  const summary = payload?.summary ?? null;
  const provider = payload?.provider ?? null;
  const ready = dataStatus === 'success' && payload?.mode !== 'waiting' && report;

  return (
    <section className="report-card" aria-labelledby="market-report-title">
      <div className="report-card__head">
        <div>
          <span className="report-card__eyebrow">유가 흐름 리포트</span>
          <h2 id="market-report-title">전국 평균 유가 자동 요약</h2>
          <p>공개 유가 데이터와 누적 이력을 바탕으로 오늘 흐름과 최근 추이를 간단히 정리합니다.</p>
        </div>
        <div className="report-card__meta">
          <strong>{getStatusLabel(ready, provider)}</strong>
          <small>{payload?.generatedAt ? `생성 ${formatDate(payload.generatedAt)}` : WAITING_TEXT}</small>
        </div>
      </div>

      <div className="report-card__headline">
        <strong>{ready ? report.headline : '유가 흐름 리포트를 준비 중입니다.'}</strong>
      </div>

      <div className="report-card__metrics" aria-label="전국 평균 가격 요약">
        <article className="report-metric">
          <span>전국 평균 휘발유</span>
          <strong>{ready ? getMetricText(summary?.latest?.gasolineAverage) : WAITING_TEXT}</strong>
        </article>
        <article className="report-metric">
          <span>전국 평균 경유</span>
          <strong>{ready ? getMetricText(summary?.latest?.dieselAverage) : WAITING_TEXT}</strong>
        </article>
        <article className="report-metric">
          <span>누적 이력</span>
          <strong>{ready && Number.isFinite(Number(summary?.seriesCount)) ? `${summary.seriesCount}회` : WAITING_TEXT}</strong>
        </article>
      </div>

      <div className="report-grid">
        <article className="report-item">
          <span>오늘 흐름</span>
          <p>{ready ? report.daily : WAITING_TEXT}</p>
        </article>
        <article className="report-item">
          <span>최근 7일</span>
          <p>{ready ? report.weekly : WAITING_TEXT}</p>
        </article>
        <article className="report-item">
          <span>최근 30일</span>
          <p>{ready ? report.monthly : WAITING_TEXT}</p>
        </article>
        <article className="report-item">
          <span>소비자 팁</span>
          <p>{ready ? report.consumerTip : '데이터가 누적되면 소비자 팁이 함께 표시됩니다.'}</p>
        </article>
      </div>

      <p className="report-card__note">
        {ready ? report.note : '공개 유가 데이터를 바탕으로 생성한 참고용 리포트입니다.'}
      </p>
    </section>
  );
}
