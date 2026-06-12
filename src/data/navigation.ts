import { BarChart2, Bell, FileText, Home, MapPin, Newspaper, Search, Star, TrendingUp, WalletCards } from 'lucide-react';
import type { NavItem } from '../components/common/types';
export const NAV_ITEMS: NavItem[] = [
  { id:'home', label:'홈', icon:Home }, { id:'stations', label:'주유소 찾기', icon:Search }, { id:'analysis', label:'가격 분석', icon:BarChart2 }, { id:'trend', label:'가격 추이', icon:TrendingUp }, { id:'records', label:'주유 기록', icon:WalletCards }, { id:'favorites', label:'즐겨찾기', icon:Star }, { id:'fuel-news', label:'유가 뉴스', icon:Newspaper }, { id:'alerts', label:'알림 설정', icon:Bell }, { id:'guide', label:'이용 가이드', icon:MapPin }, { id:'notice', label:'공지사항', icon:FileText }
];
