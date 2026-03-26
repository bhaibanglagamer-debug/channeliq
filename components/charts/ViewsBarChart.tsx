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
import { VideoData } from '@/types';
import { formatNumber, formatDateShort } from '@/lib/utils';

interface ViewsBarChartProps {
  videos: VideoData[];
  maxItems?: number;
}

function getBarColor(outlierScore: number): string {
  if (outlierScore >= 2.0) return '#a78bfa';
  if (outlierScore >= 0.8) return '#4b5589';
  return '#3d2a2a';
}

function getBarOpacity(outlierScore: number): number {
  if (outlierScore >= 2.0) return 1;
  if (outlierScore >= 0.8) return 0.8;
  return 0.5;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: VideoData }[];
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const video = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(14,14,28,0.96)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '12px',
      maxWidth: '240px',
      backdropFilter: 'blur(12px)',
    }}>
      <p className="text-gray-200 text-xs font-medium mb-2 line-clamp-2">{video.title}</p>
      <p className="text-violet-400 text-xs font-semibold">{formatNumber(video.views)} views</p>
      <p className="text-xs mt-1 text-gray-500">Outlier: <span style={{ color: getBarColor(video.outlierScore) }}>{video.outlierScore.toFixed(2)}x</span></p>
    </div>
  );
};

export function ViewsBarChart({ videos, maxItems = 30 }: ViewsBarChartProps) {
  const data = [...videos]
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    .slice(-maxItems)
    .map((v) => ({ ...v, shortDate: formatDateShort(v.publishedAt) }));

  return (
    <div className="rounded-2xl p-5 card-accent" style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-white">Views Per Video</h3>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#a78bfa' }} />
            <span>2x+</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#4b5589' }} />
            <span>avg</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#3d2a2a' }} />
            <span>low</span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="shortDate"
            tick={{ fill: '#4a4a6a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#4a4a6a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="views" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.outlierScore)} fillOpacity={getBarOpacity(entry.outlierScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
