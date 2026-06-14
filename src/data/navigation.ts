import { Car, Fuel, Map, Newspaper, WalletCards } from 'lucide-react';
import type { NavItem } from '../components/common/types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '내 주변', icon: Fuel },
  { id: 'stations', label: '가격지도', icon: Map },
  { id: 'analysis', label: '가격 분석', icon: WalletCards },
  { id: 'fuel-news', label: '유가뉴스', icon: Newspaper },
  { id: 'records', label: '내 차량', icon: Car },
];
