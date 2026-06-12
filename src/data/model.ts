import { Check, Copy, Map, TrendingDown } from 'lucide-react';
import type { BottomWidget, MetricItem } from '../components/common/types';

export const REGION_OPTIONS = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];
export interface FuelNewsItem { id: string; title: string; summary: string; source: string; publishedAt: string; link: string; originallink: string; keyword: string; }
export interface Station { id:string; name:string; brand:string; address:string; distance:number; price:number; avgDiff:number; lat:number; lng:number; trend:number[]; favorite:boolean; }
export interface FuelRecord { id:string; date:string; station:string; liter:number; price:number; }
export interface RegionFuelRow { id:string; region:string; fuel:string; avg:number; low:number; stationCount:number; }
export interface BrandBar { name:string; value:number; }

export const fuelNews: FuelNewsItem[] = [
  { id:'fuel-news-1', title:'휘발유 가격은 지역별 편차 확인 필요', summary:'가까운 주유소라도 브랜드와 위치에 따라 리터당 가격 차이가 나타납니다.', source:'오일데일리', publishedAt:'06.08', link:'', originallink:'', keyword:'휘발유' },
  { id:'fuel-news-2', title:'경유와 LPG 가격도 함께 비교', summary:'차량 유종별 평균가와 최저가를 분리해서 확인하면 비교가 더 쉬워집니다.', source:'에너지경제', publishedAt:'06.09', link:'', originallink:'', keyword:'경유' },
  { id:'fuel-news-3', title:'50L 기준 예상 결제액 확인', summary:'리터당 가격 차이를 주유량 기준 금액으로 환산해 절약 규모를 확인합니다.', source:'리터세이브', publishedAt:'06.10', link:'', originallink:'', keyword:'주유소' },
  { id:'fuel-news-4', title:'국제유가 하락 흐름에 국내 가격 안정 기대', summary:'최근 국제유가 흐름이 완만하게 낮아지며 국내 가격 추이를 함께 확인할 필요가 있습니다.', source:'마켓데일리', publishedAt:'06.11', link:'', originallink:'', keyword:'국제유가' },
  { id:'fuel-news-5', title:'유류세와 지역 평균가를 함께 확인', summary:'유류세 조정 이슈와 지역 평균 가격을 함께 보면 실제 결제액 변화를 더 쉽게 파악할 수 있습니다.', source:'주유경제', publishedAt:'06.12', link:'', originallink:'', keyword:'유류세' }
];

export const stations: Station[] = [
  { id:'station-brand-1', name:'알뜰(자영) 평균', brand:'알뜰', address:'오피넷 상표별 평균 판매가격', distance:1.1, price:1979, avgDiff:-72, lat:37.5665, lng:126.9780, trend:[1982, 1981, 1981, 1980, 1980, 1979, 1979], favorite:true },
  { id:'station-brand-2', name:'알뜰주유소 평균', brand:'알뜰', address:'오피넷 상표별 평균 판매가격', distance:1.4, price:1996, avgDiff:-55, lat:37.5665, lng:126.9780, trend:[1999, 1998, 1998, 1997, 1997, 1996, 1996], favorite:true },
  { id:'station-brand-3', name:'S-OIL 평균', brand:'S-OIL', address:'오피넷 상표별 평균 판매가격', distance:1.7, price:2010, avgDiff:-41, lat:37.5665, lng:126.9780, trend:[2013, 2012, 2012, 2011, 2011, 2010, 2010], favorite:false },
  { id:'station-brand-4', name:'HD현대오일뱅크 평균', brand:'HD현대오일뱅크', address:'오피넷 상표별 평균 판매가격', distance:2.0, price:2011, avgDiff:-40, lat:37.5665, lng:126.9780, trend:[2014, 2013, 2013, 2012, 2012, 2011, 2011], favorite:false },
  { id:'station-brand-5', name:'GS칼텍스 평균', brand:'GS칼텍스', address:'오피넷 상표별 평균 판매가격', distance:2.3, price:2013, avgDiff:-39, lat:37.5665, lng:126.9780, trend:[2016, 2015, 2015, 2014, 2014, 2013, 2013], favorite:false },
  { id:'station-brand-6', name:'SK에너지 평균', brand:'SK에너지', address:'오피넷 상표별 평균 판매가격', distance:2.6, price:2014, avgDiff:-38, lat:37.5665, lng:126.9780, trend:[2017, 2016, 2016, 2015, 2015, 2014, 2014], favorite:false }
];

export const records: FuelRecord[] = [
  { id:'record-1', date:'2026-06-11', station:'알뜰(자영) 평균', liter:50, price:1979 },
  { id:'record-2', date:'2026-06-10', station:'알뜰주유소 평균', liter:42, price:1996 },
  { id:'record-3', date:'2026-06-09', station:'S-OIL 평균', liter:48, price:2010 }
];

export const brandBars: BrandBar[] = [
  { name:'SK에너지', value:58 },
  { name:'GS칼텍스', value:52 },
  { name:'S-OIL', value:45 },
  { name:'현대', value:40 },
  { name:'알뜰', value:24 }
];

export const widgets: BottomWidget[] = [
  { title:'근처 저가 순위', action:'주유소 찾기', items:['알뜰(자영) 평균 1,979원','알뜰주유소 평균 1,996원','S-OIL 평균 2,010원'] },
  { title:'절약 계산', action:'주유 기록', items:['40L 2,880원 절약','50L 3,600원 절약','60L 4,320원 절약'] },
  { title:'가격 흐름', action:'가격 추이', items:['전국 휘발유 2,010원','전국 경유 2,005원','서울 휘발유 2,051원'] }
];

export const metrics: MetricItem[] = [
  { label:'최저 기준', value:'1,979원/L', sub:'상표별 알뜰 평균', icon:Copy },
  { label:'50L 절약', value:'3,600원', sub:'서울 평균 대비 72원 낮음', icon:Check },
  { label:'지역 평균', value:'2,051원', sub:'서울 휘발유', icon:Map },
  { label:'전국 평균', value:'2,010원', sub:'보통휘발유', icon:TrendingDown }
];
