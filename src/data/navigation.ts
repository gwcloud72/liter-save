import { Car, Fuel, HelpCircle, Map, Newspaper } from 'lucide-react';
import type { NavItem } from '../components/common/types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '내 주변', icon: Fuel },
  { id: 'stations', label: '지도', icon: Map },
  { id: 'records', label: '내 차량', icon: Car },
  { id: 'fuel-news', label: '뉴스', icon: Newspaper },
  { id: 'guide', label: '안내', icon: HelpCircle },
];
