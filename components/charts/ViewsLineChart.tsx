'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { VideoData } from '@/types';
import { formatNumber, formatDateShort } from '@/lib/utils';

interface ViewsLineChartProps {
  videos: VideoData[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: VideoData }[];
  label?: string;
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
      <p className="text-gray-500 text-[10px] mb-1">{label}</p>
      <p className="text-gray-200 text-xs font-medium mb-2 line-clamp-2">{video.title}</p>
      <p className="text-violet-400 text-xs font-semibold">{formatNumber(payload[0].value)} views</p>
    </div>
  );
};

export function ViewsLineChart({ videos }: ViewsLineChartProps) {
  const data = [...videos]
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    .map((v) => ({ ...v, shortDate: formatDateShort(v.publishedAt) }));

  return (
    <div className="rounded-2xl p-5 card-accent" style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <h3 className="text-sm font-semibold text-white mb-5">Views Over Time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
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
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#viewsGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
