import { formatNumber, formatSignedWon } from '../../lib/format.js';

const widthClasses = ['w-[92%]', 'w-[82%]', 'w-[73%]', 'w-[65%]', 'w-[56%]', 'w-[48%]', 'w-[40%]', 'w-[34%]'];

function EmptyRegion({ wide, onReset }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm font-bold text-slate-500">
      {wide && <svg viewBox="0 0 320 120" className="mx-auto mb-4 h-28 w-full max-w-[320px] text-blue-200" aria-hidden="true"><rect x="28" y="28" width="72" height="54" rx="16" fill="currentColor" opacity="0.5" /><rect x="112" y="18" width="88" height="70" rx="18" fill="currentColor" opacity="0.75" /><rect x="212" y="34" width="76" height="56" rx="16" fill="currentColor" opacity="0.45" /></svg>}
      지역별 평균가 데이터 수집 대기 중입니다.
      {onReset && <button type="button" onClick={onReset} aria-label="지역 비교 조건 초기화" className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-blue-900/10">조건 초기화</button>}
    </div>
  );
}

export default function RegionCard({ rows, variant = 'default', compact = false, onReset }) {
  const isWide = variant === 'wide';
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-4 md:p-5'}`}>
      <h2 className="mb-3 text-[16px] font-extrabold tracking-tight text-slate-950 md:mb-4 md:text-lg">
        {isWide ? '시·도별 평균가 지도' : '지역별 평균가 비교'} <span className="text-[12px] font-bold text-slate-500 md:text-sm">(휘발유)</span>
      </h2>
      {!rows.length ? <EmptyRegion wide={isWide} onReset={onReset} /> : isWide ? (
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
            <div className="grid min-h-[260px] grid-cols-6 gap-2" aria-hidden="true">
              {rows.slice(0, 8).map((row, index) => (
                <div key={row.name} className={`rounded-2xl border border-blue-100 bg-white/80 px-3 py-3 ${index === 0 ? 'col-span-3 row-span-2' : index === 1 ? 'col-span-3' : index < 4 ? 'col-span-2' : 'col-span-3'}`}>
                  <p className="text-xs font-extrabold text-slate-600">{row.name}</p>
                  <p className="mt-1 text-sm font-black text-blue-700">{formatNumber(row.averagePrice)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.name} className="grid grid-cols-[70px_1fr_90px] items-center gap-3 text-sm">
                <span className="font-extrabold text-slate-700">{row.name}</span>
                <span className="h-2.5 rounded-full bg-slate-100"><span className={`block h-2.5 rounded-full bg-blue-500/70 ${widthClasses[index] || 'w-[30%]'}`} /></span>
                <span className="text-right font-black text-slate-950">{formatNumber(row.averagePrice)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <table className="w-full text-left text-[14px] md:text-[15px]">
          <caption className="sr-only">지역별 평균가 비교</caption>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.name}>
                <th className="py-2.5 font-extrabold text-slate-800 md:py-3" scope="row">{row.name}</th>
                <td className="py-2.5 text-right font-extrabold text-slate-950 md:py-3">{formatNumber(row.averagePrice)}원/L</td>
                <td className="py-2.5 text-right text-[12px] font-bold text-blue-600 md:py-3">{formatSignedWon(row.diff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
