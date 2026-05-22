function FuelDropIcon() {
  return (
    <svg viewBox="0 0 48 48" className="mx-auto mb-3 size-12 text-blue-300" aria-hidden="true">
      <path d="M24 5c7 10 14 17 14 26a14 14 0 0 1-28 0C10 22 17 15 24 5Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 32c1 4 4 6 8 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EmptyReport({ onReset }) {
  return (
    <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/45 px-4 py-8 text-center text-sm font-bold text-slate-600">
      <FuelDropIcon />
      <p>가격 리포트 생성 대기 중입니다.</p>
      {onReset && <button type="button" onClick={onReset} aria-label="리포트 조건 초기화" className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-blue-900/10">조건 초기화</button>}
    </div>
  );
}

export default function ReportCard({ lines, variant = 'default', compact = false, title = '가격 리포트', eyebrow = '가격 흐름', onReset }) {
  const isDocument = variant === 'document';
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${isDocument ? 'p-6 md:p-7' : compact ? 'p-4' : 'p-5'}`}>
      <div className={isDocument ? 'mx-auto max-w-[820px]' : ''}>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</p>
        <h2 className={`${isDocument ? 'mt-2 text-2xl' : 'mt-1 text-lg'} font-extrabold text-slate-950`}>{title}</h2>
        <div className={`${isDocument ? 'mt-5 space-y-4' : 'mt-4 space-y-3'}`}>
          {lines.length ? lines.map((line) => (
            <p key={line} className={`${isDocument ? 'rounded-2xl border border-slate-100 bg-white px-5 py-4 text-[15px] leading-7' : 'rounded-xl bg-slate-50 px-4 py-3 text-sm'} font-bold text-slate-700`}>{line}</p>
          )) : <EmptyReport onReset={onReset} />}
        </div>
      </div>
    </section>
  );
}
