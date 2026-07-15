import type { LucideIcon } from 'lucide-react';
import { MapPinOff, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export type ServiceStateNoticeKind = 'location-denied' | 'empty-nearby' | 'data-expired';

interface CopySet {
  Icon: LucideIcon;
  title: string;
  body: string;
  action: string;
}

const copyByKind: Record<ServiceStateNoticeKind, CopySet> = {
  'location-denied': {
    Icon: MapPinOff,
    title: 'GPS 권한이 꺼져 있어요',
    body: '브라우저 위치 권한을 허용하거나 지역을 직접 선택해 주유소를 비교하세요.',
    action: '지역 직접 선택',
  },
  'empty-nearby': {
    Icon: MapPinOff,
    title: '가까운 주유소를 찾지 못했어요',
    body: '현재 위치 주변 결과가 없으면 지역 기준 가격으로 다시 비교할 수 있습니다.',
    action: '지역 기준으로 보기',
  },
  'data-expired': {
    Icon: RefreshCw,
    title: '가격 업데이트가 필요해요',
    body: '저장된 가격 기준일이 지나 최신 가격과 다를 수 있습니다. 새로 고침 후 다시 확인하세요.',
    action: '새로 고침',
  },
};

export function ServiceStateNotice({
  kind,
  onAction,
  compact = false,
}: {
  kind: ServiceStateNoticeKind;
  onAction?: () => void;
  compact?: boolean;
}) {
  const { Icon, title, body, action } = copyByKind[kind];
  return (
    <section
      className={`rounded-lg border border-ink-200 bg-white shadow-card ${compact ? 'p-ds-2' : 'p-ds-3'}`}
      aria-live="polite"
    >
      <div className="flex flex-col gap-ds-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-ds-2">
          <span className="mt-0.5 inline-flex h-ds-4 w-ds-4 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700">
            <Icon size={18} strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <strong className="block text-[15px] leading-[1.35] text-ink-900">{title}</strong>
            <span className="mt-ds-0.5 block text-[13px] leading-[1.5] text-ink-600">{body}</span>
          </span>
        </div>
        <Button variant={kind === 'data-expired' ? 'primary' : 'secondary'} size="sm" onClick={onAction} className="shrink-0">
          {action}
        </Button>
      </div>
    </section>
  );
}
