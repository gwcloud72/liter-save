import type { ReactNode } from 'react';
import type { TableColumn, TableRow } from './types';
import { EmptyState } from './EmptyState';

export interface DataTableProps {
  caption: string;
  columns: TableColumn[];
  rows: TableRow[];
  loading?: boolean;
  fallbackTitle?: string;
  fallbackDescription?: string;
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

export function DataTable({ caption, columns, rows, loading = false, fallbackTitle = '조건에 맞는 항목을 확인하세요', fallbackDescription = '필터를 조정하거나 다른 화면을 확인하세요.', footer }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-table border-separate border-spacing-0">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`bg-ink-100 px-ds-2 py-ds-1.5 text-left text-caption font-medium text-ink-500 ${index === 0 ? 'rounded-tl-lg' : ''} ${index === columns.length - 1 ? 'rounded-tr-lg' : ''} ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}
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
      {!loading && rows.length === 0 ? <div className="p-ds-3"><EmptyState title={fallbackTitle} description={fallbackDescription} compact /></div> : null}
      {footer ? <div className="border-t border-ink-100 px-ds-3 py-ds-2">{footer}</div> : null}
    </div>
  );
}
