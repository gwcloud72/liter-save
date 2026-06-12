import type { ChangeDirection } from './types';
import { SparklineChart } from '../charts/SparklineChart';

export function MiniTrend({ values, direction = 'flat' }: { values: number[]; direction?: ChangeDirection }) {
  return <SparklineChart values={values} direction={direction} height={36} />;
}
