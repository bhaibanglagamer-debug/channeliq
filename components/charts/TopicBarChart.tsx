'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TopicCluster } from '@/types';
import { formatNumber } from '@/lib/utils';

interface TopicBarChartProps {
  clusters: TopicCluster[];
}

const COLORS = [
  '#9333ea',
  '#7c3aed',
  '#6d28d9',
  '#5b21b6',
  '#4c1d95',
  '#3b0764',
  '#2e1065',
  '#1e1b4b',
];

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TopicCluster & { avgOutlierScore: number } }[];
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const cluster = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-white text-xs font-medium mb-1">{cluster.topic}</p>
      <p className="text-gray-300 text-xs">{cluster.videos.length} videos</p>
      <p className="text-purple-400 text-xs">Avg outlier: {cluster.avgOutlierScore.toFixed(2)}x</p>
      <p className="text-gray-400 text-xs">{formatNumber(cluster.totalViews)} total views</p>
    </div>
  );
};

export function TopicBarChart({ clusters }: TopicBarChartProps) {
  const sorted = [...clusters].sort((a, b) => b.avgOutlierScore - a.avgOutlierScore);

  return (
    <div className="bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Topic Performance (Avg Outlier Score)</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 45)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}x`}
          />
          <YAxis
            type="category"
            dataKey="topic"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="avgOutlierScore" radius={[0, 4, 4, 0]}>
            {sorted.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
