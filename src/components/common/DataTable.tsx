import type { ReactNode } from 'react';
import type { TableColumn, TableRow } from './types';
import { EmptyState } from './EmptyState';

export interface DataTableProps {
  caption: string;
  columns: TableColumn[];
  rows: TableRow[];
  loading?: boolean;
  fallbackTitle?: string;
  footer?: ReactNode;
}

function TableSkeleton({ columns }: { columns: TableColumn[] }) {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`}>
          {columns.map((column) => (
            <td key={`${rowIndex}-${column.key}`} className="border-b border-ink-100 px-ds-2 py-ds-2">
              <div className="h-ds-2 w-full rounded-md ds-skeleton" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function MobileTableSkeleton({ columns }: { columns: TableColumn[] }) {
  return (
    <div className="space-y-ds-2 p-ds-2 tablet:hidden" aria-label="목록 로딩">
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <article key={`mobile-skeleton-${rowIndex}`} className="rounded-card border border-ink-200 bg-white p-ds-2 shadow-card">
          {columns.slice(0, 4).map((column) => (
            <div key={`${rowIndex}-${column.key}`} className="grid grid-cols-[88px_minmax(0,1fr)] gap-ds-2 border-b border-ink-100 py-ds-1 last:border-b-0">
              <span className="h-ds-2 rounded-md ds-skeleton" />
              <span className="h-ds-2 rounded-md ds-skeleton" />
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}

function MobileTableCards({ caption, columns, rows }: { caption: string; columns: TableColumn[]; rows: TableRow[] }) {
  return (
    <div role="list" aria-label={caption} className="space-y-ds-2 p-ds-2 tablet:hidden">
      {rows.map((row) => (
        <article
          key={row.id}
          role="listitem"
          data-mobile-table-card="true"
          className="rounded-card border border-ink-200 bg-white p-ds-2 shadow-card"
        >
          <dl>
            {columns.map((column) => (
              <div
                key={column.key}
                className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-ds-2 border-b border-ink-100 py-ds-1.5 last:border-b-0"
              >
                <dt className="text-caption font-bold text-ink-500">{column.label}</dt>
                <dd className={`min-w-0 text-body-2 text-ink-800 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}>
                  {row.cells[column.key]}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

export function DataTable({ caption, columns, rows, loading = false, fallbackTitle = '조건에 맞는 항목을 확인하세요', footer }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card">
      {loading ? <MobileTableSkeleton columns={columns} /> : <MobileTableCards caption={caption} columns={columns} rows={rows} />}
      <div className="hidden overflow-x-auto tablet:block">
        <table className="w-full min-w-table border-separate border-spacing-0">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`bg-ink-100 px-ds-2 py-ds-1.5 text-left text-caption font-bold text-ink-500 ${index === 0 ? 'rounded-tl-lg' : ''} ${index === columns.length - 1 ? 'rounded-tr-lg' : ''} ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          {loading ? <TableSkeleton columns={columns} /> : (
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="transition-fast duration-fast ease-product hover:bg-ink-50">
                  {columns.map((column) => (
                    <td key={column.key} className={`border-b border-ink-100 px-ds-2 py-ds-2 text-body-2 text-ink-700 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}>{row.cells[column.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {!loading && rows.length === 0 ? <div className="p-ds-3"><EmptyState title={fallbackTitle} compact /></div> : null}
      {footer ? <div className="border-t border-ink-100 px-ds-3 py-ds-2">{footer}</div> : null}
    </div>
  );
}
