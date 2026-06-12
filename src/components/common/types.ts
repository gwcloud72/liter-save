import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ChangeDirection = 'up' | 'down' | 'flat';
export type HeroKind = 'farm' | 'liter' | 'sang' | 'solid';
export type LayoutKind = 'sidebar' | 'gnb';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface MetricItem {
  label: string;
  value: string;
  sub: string;
  icon?: LucideIcon;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface TableRow {
  id: string;
  cells: Record<string, ReactNode>;
}

export interface BottomWidget {
  title: string;
  action: string;
  items: string[];
}
