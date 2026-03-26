'use client';

import { useEffect, useState, useMemo } from 'react';
import { VideoData } from '@/types';
import { StatCard } from '@/components/StatCard';
import { VideoTable } from '@/components/VideoTable';
import { ViewsBarChart } from '@/components/charts/ViewsBarChart';
import { ViewsLineChart } from '@/components/charts/ViewsLineChart';
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/SkeletonLoader';
import { formatNumber } from '@/lib/utils';
import { BarChart2, Eye, TrendingUp, Trophy, RefreshCw, AlertTriangle } from 'lucide-react';
import { clientGet, clientSet } from '@/lib/client-cache';

type Period = '7' | '14' | '30' | '90';

interface ChannelData {
  videos: VideoData[];
  channelId: string;
  channelTitle: string;
}

function calcMedianLocal(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '7 days', value: '7' },
  { label: '14 days', value: '14' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
];

export default function DashboardPage() {
  const [data, setData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ type: string; message: string } | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [period, setPeriod] = useState<Period>('90');

  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cached = clientGet<ChannelData>('channel-data');
      if (cached) {
        setData(cached);
        setFromCache(true);
        setLoading(false);
        return;
      }
    }

    setFromCache(false);
    try {
      const res = await fetch('/api/youtube/channel');
      const json = await res.json();
      if (!res.ok || json.error) {
        setError({ type: json.error || 'api_error', message: json.message || 'Failed to fetch channel data' });
        return;
      }
      clientSet('channel-data', json);
      setData(json);
    } catch {
      setError({ type: 'network_error', message: 'Network error. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(false); }, []);

  // Filter videos by selected period and recalculate outlier scores client-side
  const filteredVideos = useMemo(() => {
    if (!data) return [];
    const videos = data.videos;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(period));
    const filtered = videos.filter((v) => new Date(v.publishedAt) >= cutoff);

    // Recalculate outlier scores based on filtered set median
    const sorted = [...filtered].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const last30 = sorted.slice(0, 30);
    const median = calcMedianLocal(last30.map((v) => v.views));
    return sorted.map((v) => ({
      ...v,
      outlierScore: median > 0 ? Math.round((v.views / median) * 100) / 100 : 1,
    }));
  }, [data, period]);

  const stats = useMemo(() => {
    if (!filteredVideos.length) return null;
    const totalVideos = filteredVideos.length;
    const avgViews = Math.round(filteredVideos.reduce((s, v) => s + v.views, 0) / totalVideos);
    const avgOutlier = Math.round((filteredVideos.reduce((s, v) => s + v.outlierScore, 0) / totalVideos) * 100) / 100;
    const bestVideo = [...filteredVideos].sort((a, b) => b.outlierScore - a.outlierScore)[0];
    return { totalVideos, avgViews, avgOutlier, bestVideo };
  }, [filteredVideos]);

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Channel Dashboard</h1>
          <p className="text-sm text-gray-500">
            {data?.channelTitle ? data.channelTitle : '@michtortiyt'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fromCache && !loading && (
            <span className="text-xs text-gray-600">
              Cached ·{' '}
              <button onClick={() => { fetchData(true); }} className="text-violet-400 hover:text-violet-300 transition-colors">
                Force refresh
              </button>
            </span>
          )}
          <button
            onClick={() => { fetchData(true); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9ca3af',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-1.5 mb-7 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={period === opt.value ? {
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: 'white',
              boxShadow: '0 0 12px rgba(124,58,237,0.4)',
            } : {
              color: '#6b7280',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-red-400">Error Loading Data</p>
            <p className="text-xs mt-1 text-red-400/70">{error.message}</p>
          </div>
          <button onClick={() => { fetchData(true); }} className="text-xs px-3 py-1.5 rounded-lg text-gray-300 transition-colors shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Videos" value={stats?.totalVideos ?? 0} subtitle={`Last ${period} days`} icon={<BarChart2 className="w-4 h-4" />} accent="purple" />
            <StatCard title="Avg Views" value={formatNumber(stats?.avgViews ?? 0)} subtitle="Per video" icon={<Eye className="w-4 h-4" />} accent="blue" />
            <StatCard title="Avg Outlier" value={`${stats?.avgOutlier ?? 0}x`} subtitle="vs channel median" icon={<TrendingUp className="w-4 h-4" />} accent="green" />
            <StatCard
              title="Best Video"
              value={stats?.bestVideo ? `${stats.bestVideo.outlierScore.toFixed(1)}x` : '—'}
              subtitle={stats?.bestVideo?.title?.slice(0, 40) + (stats?.bestVideo && stats.bestVideo.title.length > 40 ? '…' : '') || 'No data'}
              icon={<Trophy className="w-4 h-4" />}
              accent="orange"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        {loading ? (
          <><ChartSkeleton height={340} /><ChartSkeleton height={340} /></>
        ) : filteredVideos.length > 0 ? (
          <>
            <ViewsBarChart videos={filteredVideos} maxItems={30} />
            <ViewsLineChart videos={filteredVideos} />
          </>
        ) : null}
      </div>

      {/* Video Table */}
      {loading ? (
        <TableSkeleton rows={10} />
      ) : filteredVideos.length > 0 ? (
        <VideoTable videos={filteredVideos} showThumbnail />
      ) : !error ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-gray-500 text-sm">No videos found for this period.</p>
          <button onClick={() => setPeriod('90')} className="mt-3 text-violet-400 hover:text-violet-300 text-sm transition-colors">Show last 90 days</button>
        </div>
      ) : null}
    </div>
  );
}
