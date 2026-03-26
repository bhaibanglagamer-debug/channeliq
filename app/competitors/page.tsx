'use client';

import { useEffect, useState, useMemo } from 'react';
import { CompetitorData, VideoData, Gap } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceDot,
} from 'recharts';
import { ChartSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';
import { AlertTriangle, Plus, RefreshCw, X, Lightbulb } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { clientGet, clientSet } from '@/lib/client-cache';

const DEFAULT_HANDLES = ['@LiamOttley', '@NicholasPuru', '@nateherk', '@nicksaraev', '@corbingpt'];

const CHANNEL_COLORS: Record<string, string> = {
  '@michtortiyt': '#a855f7',
  '@LiamOttley': '#3b82f6',
  '@NicholasPuru': '#f59e0b',
  '@nateherk': '#10b981',
  '@nicksaraev': '#06b6d4',
  '@corbingpt': '#ef4444',
};

type Period = '7' | '14' | '30' | '90';
const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '7 days', value: '7' },
  { label: '14 days', value: '14' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
];

function getColor(handle: string, index: number): string {
  const fallbacks = ['#a855f7', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
  return CHANNEL_COLORS[handle] || fallbacks[index % fallbacks.length];
}

function filterByPeriod(videos: VideoData[], days: number): VideoData[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return videos.filter((v) => new Date(v.publishedAt) >= cutoff);
}

function buildTrendPoints(videos: VideoData[], buckets = 5): number[] {
  if (!videos.length) return Array(buckets).fill(0);
  const sorted = [...videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  const size = Math.ceil(sorted.length / buckets);
  const result: number[] = [];
  for (let i = 0; i < buckets; i++) {
    const chunk = sorted.slice(i * size, (i + 1) * size);
    if (!chunk.length) { result.push(result[result.length - 1] || 0); continue; }
    result.push(Math.round(chunk.reduce((s, v) => s + v.views, 0) / chunk.length));
  }
  return result;
}

function buildChartData(
  michele: { videos: VideoData[] },
  competitors: CompetitorData[],
  period: number,
  buckets = 5
): { bucket: string; [key: string]: string | number }[] {
  const allChannels = [
    { handle: '@michtortiyt', name: 'Michele', videos: filterByPeriod(michele.videos, period) },
    ...competitors.map((c) => ({
      handle: c.handle,
      name: c.handle.replace('@', ''),
      videos: filterByPeriod(c.videos, period),
    })),
  ];

  const trendData: { bucket: string; [key: string]: string | number }[] = Array.from({ length: buckets }, (_, i) => ({
    bucket: i === 0 ? 'Oldest' : i === buckets - 1 ? 'Latest' : `${buckets - i - 1}w ago`,
  }));

  for (const channel of allChannels) {
    const points = buildTrendPoints(channel.videos, buckets);
    points.forEach((val, i) => { trendData[i][channel.name] = val; });
  }
  return trendData;
}

function findCrossings(
  data: { bucket: string; [key: string]: string | number }[],
  nameA: string,
  nameB: string
): number[] {
  const crossings: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const aOld = (data[i - 1][nameA] as number) || 0;
    const bOld = (data[i - 1][nameB] as number) || 0;
    const aCurr = (data[i][nameA] as number) || 0;
    const bCurr = (data[i][nameB] as number) || 0;
    if ((aOld - bOld) * (aCurr - bCurr) < 0) crossings.push(i);
  }
  return crossings;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [micheleVideos, setMicheleVideos] = useState<VideoData[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [handles, setHandles] = useState<string[]>(DEFAULT_HANDLES);
  const [handlesLoaded, setHandlesLoaded] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [addingHandle, setAddingHandle] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [period, setPeriod] = useState<Period>('90');

  // Load saved handles from server on mount
  useEffect(() => {
    fetch('/api/competitors-config')
      .then((r) => r.json())
      .then((json) => {
        if (json.handles) setHandles(json.handles);
        setHandlesLoaded(true);
      })
      .catch(() => setHandlesLoaded(true));
  }, []);

  // Save handles to server whenever they change (after initial load)
  useEffect(() => {
    if (!handlesLoaded) return;
    fetch('/api/competitors-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handles }),
    }).catch(() => {});
  }, [handles, handlesLoaded]);

  const fetchData = async (h: string[] = handles, forceRefresh = false) => {
    setLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cached = clientGet<{ competitors: CompetitorData[]; micheleVideos: VideoData[] }>('competitors-data');
      if (cached) {
        setCompetitors(cached.competitors);
        setMicheleVideos(cached.micheleVideos);
        setLoading(false);
        return;
      }
    }

    try {
      const [compRes, michRes] = await Promise.all([
        fetch(`/api/youtube/competitors?handles=${h.join(',')}`),
        fetch('/api/youtube/channel'),
      ]);
      const [compJson, michJson] = await Promise.all([compRes.json(), michRes.json()]);

      if (!compRes.ok || compJson.error) {
        setError({ message: compJson.message || 'Failed to fetch competitor data' });
        return;
      }

      const comps: CompetitorData[] = compJson.competitors || [];
      const mVids: VideoData[] = michJson.videos || [];
      setCompetitors(comps);
      setMicheleVideos(mVids);
      if (michJson.videos) clientSet('channel-data', michJson);
      clientSet('competitors-data', { competitors: comps, micheleVideos: mVids });
    } catch {
      setError({ message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data once handles are loaded
  useEffect(() => {
    if (handlesLoaded) fetchData(handles);
  }, [handlesLoaded]);

  const fetchGaps = async () => {
    if (!micheleVideos.length || !competitors.length) return;
    setLoadingGaps(true);
    try {
      const micheleTitles = micheleVideos.slice(0, 30).map((v) => v.title);
      const competitorTitles = competitors.flatMap((c) =>
        c.videos.slice(0, 10).map((v) => ({ channel: c.handle, title: v.title }))
      );
      const res = await fetch('/api/openai/gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ micheleTitles, competitorTitles }),
      });
      const json = await res.json();
      setGaps(json.gaps || []);
    } catch {
      console.error('Failed to fetch gaps');
    } finally {
      setLoadingGaps(false);
    }
  };

  const handleAddCompetitor = async () => {
    const h = newHandle.trim();
    if (!h) return;
    const handle = h.startsWith('@') ? h : `@${h}`;
    if (handles.includes(handle)) return;
    setAddingHandle(true);
    try {
      const res = await fetch('/api/youtube/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });
      const json = await res.json();
      if (res.ok && json.competitor) {
        setCompetitors((prev) => [...prev, json.competitor]);
        setHandles((prev) => [...prev, handle]);
        setNewHandle('');
      }
    } catch {
      console.error('Failed to add competitor');
    } finally {
      setAddingHandle(false);
    }
  };

  const removeCompetitor = (handle: string) => {
    setHandles((prev) => prev.filter((h) => h !== handle));
    setCompetitors((prev) => prev.filter((c) => c.handle !== handle));
    // Invalidate client cache so re-fetch uses new list
    clientSet('competitors-data', null as any);
  };

  const periodDays = parseInt(period);

  const chartData = useMemo(() => {
    if (!micheleVideos.length && !competitors.length) return [];
    return buildChartData({ videos: micheleVideos }, competitors, periodDays, 5);
  }, [micheleVideos, competitors, period]);

  const channelNames = useMemo(
    () => ['Michele', ...competitors.map((c) => c.handle.replace('@', ''))],
    [competitors]
  );

  const crossings = useMemo(() => {
    if (!chartData.length) return [];
    const all: { index: number; withChannel: string }[] = [];
    competitors.forEach((c) => {
      const name = c.handle.replace('@', '');
      findCrossings(chartData, 'Michele', name).forEach((idx) => {
        all.push({ index: idx, withChannel: name });
      });
    });
    return all;
  }, [chartData, competitors]);

  const channelStats = useMemo(() => {
    const allChannels = [
      { handle: '@michtortiyt', name: 'Michele', videos: filterByPeriod(micheleVideos, periodDays) },
      ...competitors.map((c) => ({
        handle: c.handle,
        name: c.handle.replace('@', ''),
        videos: filterByPeriod(c.videos, periodDays),
      })),
    ];
    return allChannels.map((ch, i) => {
      if (!ch.videos.length) return { handle: ch.handle, name: ch.name, avgViews: 0, recentGrowth: 0, color: getColor(ch.handle, i) };
      const sorted = [...ch.videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
      const half = Math.ceil(sorted.length / 2);
      const oldAvg = sorted.slice(0, half).reduce((s, v) => s + v.views, 0) / half;
      const newAvg = sorted.slice(half).reduce((s, v) => s + v.views, 0) / (sorted.length - half || 1);
      return {
        handle: ch.handle,
        name: ch.name,
        avgViews: Math.round(ch.videos.reduce((s, v) => s + v.views, 0) / ch.videos.length),
        recentGrowth: oldAvg > 0 ? Math.round(((newAvg - oldAvg) / oldAvg) * 100) : 0,
        color: getColor(ch.handle, i),
      };
    });
  }, [micheleVideos, competitors, period]);

  const allChannelData = useMemo(() => [
    { handle: '@michtortiyt', name: 'Michele', videos: micheleVideos },
    ...competitors.map((c) => ({ handle: c.handle, name: c.handle.replace('@', ''), videos: c.videos })),
  ], [micheleVideos, competitors]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Competitors</h1>
          <p className="text-gray-400 text-sm">View trends, momentum, and content gaps vs competitors</p>
        </div>
        <button
          onClick={() => { fetchData(handles, true); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === opt.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1"><p className="text-sm">{error.message}</p></div>
          <button onClick={() => { fetchData(handles, true); }} className="text-xs px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">Retry</button>
        </div>
      )}

      {/* Channel Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} className="h-24" />)
        ) : (
          channelStats.map((stat) => (
            <div key={stat.handle} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: stat.color }} />
                <span className="text-xs font-semibold text-white truncate">{stat.name}</span>
              </div>
              <p className="text-sm font-bold text-white">{formatNumber(stat.avgViews)}</p>
              <p className="text-xs text-gray-500 mb-1.5">avg views</p>
              <span className={`text-xs font-medium ${stat.recentGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stat.recentGrowth >= 0 ? '↑' : '↓'} {Math.abs(stat.recentGrowth)}%
              </span>
            </div>
          ))
        )}
      </div>

      {/* Trend Line Chart */}
      {loading ? (
        <ChartSkeleton height={340} />
      ) : chartData.length > 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-white">View Trend (last {period} days)</h3>
            {crossings.length > 0 && (
              <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                {crossings.length} crossover{crossings.length > 1 ? 's' : ''} ⚡
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mb-4">Avg views per video — oldest → latest within period</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatNumber(v)} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '10px', padding: '10px 14px' }}
                labelStyle={{ color: '#f9fafb', fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ fontSize: 12 }}
                formatter={(value: number, name: string) => [formatNumber(value) + ' avg views', name]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={8} />
              {channelNames.map((name, i) => {
                const handle = name === 'Michele' ? '@michtortiyt' : handles.find(h => h.toLowerCase().includes(name.toLowerCase())) || `@${name}`;
                const color = getColor(handle, i);
                return (
                  <Line key={name} type="monotone" dataKey={name} stroke={color}
                    strokeWidth={name === 'Michele' ? 3 : 2}
                    dot={{ r: 4, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: color }}
                    connectNulls
                  />
                );
              })}
              {crossings.map((cross, i) => {
                const bucketLabel = chartData[cross.index]?.bucket;
                const micheleVal = (chartData[cross.index]?.['Michele'] as number) || 0;
                return (
                  <ReferenceDot key={i} x={bucketLabel} y={micheleVal} r={8}
                    fill="transparent" stroke="#fbbf24" strokeWidth={2}
                    label={{ value: '⚡', position: 'top', fontSize: 14 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Top videos per channel */}
      {!loading && allChannelData.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          {allChannelData.map((ch, i) => {
            const color = getColor(ch.handle, i);
            const filteredVids = filterByPeriod(ch.videos, periodDays);
            const topVideos = [...filteredVids].sort((a, b) => b.views - a.views).slice(0, 3);
            return (
              <div key={ch.handle} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <h3 className="text-sm font-semibold text-white">{ch.name}</h3>
                    <span className="text-xs text-gray-500">{ch.handle}</span>
                  </div>
                  {ch.handle !== '@michtortiyt' && (
                    <button
                      onClick={() => removeCompetitor(ch.handle)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
                {topVideos.length > 0 ? (
                  <div className="space-y-3">
                    {topVideos.map((v, j) => (
                      <div key={v.id} className="flex items-start gap-2.5">
                        <span className="text-xs text-gray-600 mt-0.5 w-4 shrink-0">{j + 1}</span>
                        <div className="flex-1 min-w-0">
                          <a href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-gray-200 hover:text-purple-400 transition-colors line-clamp-2">
                            {v.title}
                          </a>
                          <p className="text-xs text-gray-500 mt-0.5">{formatNumber(v.views)} views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">No videos in this period</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Competitor */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">Add Competitor</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newHandle}
            onChange={(e) => setNewHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
            placeholder="@channelhandle"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-purple-600 placeholder-gray-500"
          />
          <button
            onClick={handleAddCompetitor}
            disabled={addingHandle || !newHandle.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {addingHandle ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {handles.map((h) => (
            <span key={h} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 text-xs">
              {h}
              <button onClick={() => removeCompetitor(h)} className="hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">Your competitor list is saved automatically</p>
      </div>

      {/* Gap Detector */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-white">Content Gap Detector</h3>
          </div>
          <button
            onClick={fetchGaps}
            disabled={loadingGaps || loading || competitors.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingGaps ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            {loadingGaps ? 'Analyzing...' : 'Find Gaps'}
          </button>
        </div>
        {gaps.length > 0 ? (
          <div className="space-y-3">
            {gaps.map((gap, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 gap-3 mb-2">
                  <h4 className="text-sm font-semibold text-white">{gap.topic}</h4>
                  <div className="flex gap-1 shrink-0 flex-wrap">
                    {gap.coveredBy.map((ch) => (
                      <span key={ch} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{ch}</span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-300">
                  <span className="text-yellow-400 font-medium">Opportunity: </span>{gap.suggestion}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Lightbulb className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Click &ldquo;Find Gaps&rdquo; to see what topics you&rsquo;re missing</p>
          </div>
        )}
      </div>
    </div>
  );
}
