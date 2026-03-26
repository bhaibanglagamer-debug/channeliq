'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { VideoData } from '@/types';
import { formatNumber } from '@/lib/utils';

interface ScatterDataPoint {
  x: number;
  y: number;
  title: string;
  topic: string;
}

interface ScatterPlotProps {
  videos: VideoData[];
  classifications: { title: string; topic: string }[];
}

const TOPIC_COLORS: Record<string, string> = {
  'Make.com Tutorial': '#9333ea',
  'n8n Tutorial': '#3b82f6',
  'AI Agency Tips': '#f59e0b',
  'Case Study': '#10b981',
  'AI Tools Review': '#ef4444',
  'Automation Workflow': '#8b5cf6',
  'Business Growth': '#ec4899',
  'Other': '#6b7280',
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ScatterDataPoint }[];
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 max-w-xs shadow-xl">
      <p className="text-white text-xs font-medium mb-1 line-clamp-2">{point.title}</p>
      <p className="text-purple-400 text-xs">{formatNumber(point.y)} views</p>
      <p className="text-gray-400 text-xs">{point.topic}</p>
    </div>
  );
};

export function ScatterPlot({ videos, classifications }: ScatterPlotProps) {
  const classMap = new Map(classifications.map((c) => [c.title, c.topic]));

  const groupedData: Record<string, ScatterDataPoint[]> = {};

  videos.forEach((video) => {
    const topic = classMap.get(video.title) || 'Other';
    if (!groupedData[topic]) groupedData[topic] = [];
    groupedData[topic].push({
      x: new Date(video.publishedAt).getTime(),
      y: video.views,
      title: video.title,
      topic,
    });
  });

  const topics = Object.keys(groupedData);

  return (
    <div className="bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Views by Topic Over Time</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['auto', 'auto']}
            name="Date"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => {
              const d = new Date(v);
              return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear().toString().slice(2)}`;
            }}
          />
          <YAxis
            dataKey="y"
            type="number"
            name="Views"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs text-gray-400">{value}</span>}
          />
          {topics.map((topic) => (
            <Scatter
              key={topic}
              name={topic}
              data={groupedData[topic]}
              fill={TOPIC_COLORS[topic] || '#6b7280'}
              opacity={0.8}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
