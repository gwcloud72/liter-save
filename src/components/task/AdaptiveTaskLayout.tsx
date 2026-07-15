import type { ReactNode } from 'react';

export type TaskLayoutMode = 'decision' | 'market' | 'schedule';
export type CollectionDensity = 'compact' | 'standard' | 'dense';
export type ContextDensity = 'lean' | 'balanced' | 'rich';
export type LayoutFlow = 'balanced-row' | 'detail-stack';
export type WideLayout = 'two-pane' | 'three-pane';

interface AdaptiveTaskLayoutProps {
  toolbar: ReactNode;
  list: ReactNode;
  detail: ReactNode;
  supporting: ReactNode;
  mobile: ReactNode;
  collectionCount: number;
  supportingSectionCount: number;
  mode: TaskLayoutMode;
  detailPriority?: boolean;
}

interface LayoutEstimate {
  listHeight: number;
  detailHeight: number;
  contextHeight: number;
  flow: LayoutFlow;
  wide: WideLayout;
}

function collectionDensity(count: number): CollectionDensity {
  if (count <= 6) return 'compact';
  if (count <= 12) return 'standard';
  return 'dense';
}

function contextDensity(count: number): ContextDensity {
  if (count <= 1) return 'lean';
  if (count === 2) return 'balanced';
  return 'rich';
}

function estimateLayout(mode: TaskLayoutMode, collectionCount: number, supportingSectionCount: number): LayoutEstimate {
  const rowHeight = mode === 'schedule' ? 72 : mode === 'decision' ? 64 : 56;
  const detailHeight = mode === 'decision' ? 860 : mode === 'market' ? 560 : 360;
  const contextUnitHeight = mode === 'market' ? 210 : mode === 'schedule' ? 220 : 160;
  const listHeight = 96 + Math.min(Math.max(collectionCount, 1), 14) * rowHeight;
  const contextHeight = Math.max(supportingSectionCount, 1) * contextUnitHeight;
  const flow = mode !== 'decision' && listHeight >= detailHeight * 1.25 && detailHeight + contextHeight <= listHeight * 1.25
    ? 'detail-stack'
    : 'balanced-row';
  const wide = supportingSectionCount >= 3 ? 'three-pane' : 'two-pane';
  return { listHeight, detailHeight, contextHeight, flow, wide };
}

export function AdaptiveTaskLayout({
  toolbar,
  list,
  detail,
  supporting,
  mobile,
  collectionCount,
  supportingSectionCount,
  mode,
  detailPriority = false,
}: AdaptiveTaskLayoutProps) {
  const listDensity = collectionDensity(collectionCount);
  const supportingDensity = contextDensity(supportingSectionCount);
  const layoutEstimate = estimateLayout(mode, collectionCount, supportingSectionCount);

  return (
    <div
      data-task-layout="adaptive"
      data-density-layout="adaptive-data"
      data-layout-mode={mode}
      data-layout-flow={layoutEstimate.flow}
      data-wide-layout={layoutEstimate.wide}
      data-collection-density={listDensity}
      data-context-density={supportingDensity}
      data-collection-count={collectionCount}
      data-supporting-section-count={supportingSectionCount}
      data-estimated-list-height={layoutEstimate.listHeight}
      data-estimated-detail-height={layoutEstimate.detailHeight}
      data-estimated-context-height={layoutEstimate.contextHeight}
      data-detail-priority={detailPriority || undefined}
    >
      <div className="desktop:hidden">{mobile}</div>
      <section className="task-workspace hidden min-w-0 desktop:block" aria-label="데이터 탐색 작업영역">
        <header data-task-toolbar="true" className="task-workspace-toolbar">{toolbar}</header>
        <div className="task-adaptive-grid min-w-0">
          <section data-task-pane="list" className="min-w-0">
            <div className="task-pane-stack">{list}</div>
          </section>
          <section data-task-pane="detail" className="min-w-0">
            <div className="task-pane-stack">{detail}</div>
          </section>
          <aside data-task-pane="supporting" className="min-w-0">
            <div className="task-pane-stack">{supporting}</div>
          </aside>
        </div>
      </section>
    </div>
  );
}
