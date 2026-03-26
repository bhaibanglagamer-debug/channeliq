'use client';

import { useEffect, useState, useMemo } from 'react';
import { VideoData, TopicCluster, ClassificationResult } from '@/types';
import { TopicBarChart } from '@/components/charts/TopicBarChart';
import { VideoTable } from '@/components/VideoTable';
import { TableSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';
import { formatNumber, getOutlierBgColor } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { clientGet, clientSet } from '@/lib/client-cache';

type Period = '7' | '14' | '30' | '90';

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '7 days', value: '7' },
  { label: '14 days', value: '14' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
];

function calcMedianLocal(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export default function WhatsWorkingPage() {
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const [classifications, setClassifications] = useState<ClassificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<{ type: string; message: string } | null>(null);
  const [period, setPeriod] = useState<Period>('90');

  const fetchData = async (forceRefresh = false) => {
    // If we have classifications cached and not force-refreshing, use cache
    if (!forceRefresh) {
      const cachedAnalysis = clientGet<{ videos: VideoData[]; classifications: ClassificationResult[] }>('whats-working-data');
      if (cachedAnalysis) {
        setAllVideos(cachedAnalysis.videos);
        setClassifications(cachedAnalysis.classifications);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      // Get channel videos (reuse cache from dashboard if available)
      let channelJson = forceRefresh ? null : clientGet<{ videos: VideoData[] }>('channel-data');
      if (!channelJson) {
        const channelRes = await fetch('/api/youtube/channel');
        const fetched = await channelRes.json();
        if (!channelRes.ok || fetched.error) {
          setError({ type: fetched.error, message: fetched.message });
          return;
        }
        clientSet('channel-data', fetched);
        channelJson = fetched as { videos: VideoData[] };
      }

      const fetchedVideos: VideoData[] = channelJson.videos;
      setAllVideos(fetchedVideos);

      // Classify with OpenAI
      setClassifying(true);
      const titles = fetchedVideos.map((v) => v.title);
      const classRes = await fetch('/api/openai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles }),
      });
      const classJson = await classRes.json();
      const cls: ClassificationResult[] = classJson.classifications || [];
      setClassifications(cls);

      // Cache the combined result for 1 hour
      clientSet('whats-working-data', { videos: fetchedVideos, classifications: cls });
    } catch {
      setError({ type: 'network_error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
      setClassifying(false);
    }
  };

  useEffect(() => { fetchData(false); }, []);

  // Filter videos by period and recalculate outlier scores
  const filteredVideos = useMemo(() => {
    if (!allVideos.length) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(period));
    const videos = allVideos.filter((v) => new Date(v.publishedAt) >= cutoff);
    const median = calcMedianLocal(videos.slice(0, 30).map((v) => v.views));
    return videos.map((v) => ({
      ...v,
      outlierScore: median > 0 ? Math.round((v.views / median) * 100) / 100 : 1,
    }));
  }, [allVideos, period]);

  // Build clusters from filtered videos
  const clusters: TopicCluster[] = useMemo(() => {
    if (!filteredVideos.length || !classifications.length) return [];
    const classMap = new Map(classifications.map((c) => [c.title, c.topic]));
    const groups: Record<string, VideoData[]> = {};
    filteredVideos.forEach((v) => {
      const topic = classMap.get(v.title) || 'Other';
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(v);
    });
    return Object.entries(groups)
      .map(([topic, vids]) => ({
        topic,
        videos: vids,
        avgOutlierScore: Math.round((vids.reduce((s, v) => s + v.outlierScore, 0) / vids.length) * 100) / 100,
        totalViews: vids.reduce((s, v) => s + v.views, 0),
      }))
      .sort((a, b) => b.avgOutlierScore - a.avgOutlierScore);
  }, [filteredVideos, classifications]);

  const top5 = useMemo(() => [...filteredVideos].sort((a, b) => b.outlierScore - a.outlierScore).slice(0, 5), [filteredVideos]);
  const bottom5 = useMemo(() => [...filteredVideos].sort((a, b) => a.outlierScore - b.outlierScore).slice(0, 5), [filteredVideos]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">What&apos;s Working</h1>
          <p className="text-gray-400 text-sm">Topic clusters ranked by outlier score</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-6">
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
          <div className="flex-1">
            <p className="font-medium text-sm">Error Loading Data</p>
            <p className="text-xs mt-1 opacity-80">{error.message}</p>
          </div>
          <button onClick={() => fetchData(true)} className="text-xs px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">Retry</button>
        </div>
      )}

      {classifying && (
        <div className="mb-4 px-4 py-2.5 bg-purple-600/10 border border-purple-600/20 rounded-lg text-purple-400 text-sm flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Classifying videos with AI — this only runs once and is cached
        </div>
      )}

      {/* Topic cluster bar chart */}
      {loading ? (
        <SkeletonLoader className="h-72 mb-6" />
      ) : clusters.length > 0 ? (
        <div className="mb-6">
          <TopicBarChart clusters={clusters} />
        </div>
      ) : null}

      {/* Topic cluster cards */}
      {!loading && clusters.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {clusters.map((cluster) => (
            <div key={cluster.topic} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs text-gray-400 font-medium mb-1">{cluster.topic}</p>
              <p className="text-xl font-bold text-white mb-1">{cluster.avgOutlierScore.toFixed(2)}x</p>
              <p className="text-xs text-gray-500">{cluster.videos.length} videos · {formatNumber(cluster.totalViews)} views</p>
            </div>
          ))}
        </div>
      )}

      {/* Top 5 / Bottom 5 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        {loading ? (
          <><SkeletonLoader className="h-64" /><SkeletonLoader className="h-64" /></>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-white">Top 5 Performing</h3>
              </div>
              <div className="space-y-3">
                {top5.map((video, i) => (
                  <div key={video.id} className="flex items-start gap-3">
                    <span className="text-xs text-gray-500 mt-0.5 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-white hover:text-purple-400 transition-colors line-clamp-2">
                        {video.title}
                      </a>
                      <p className="text-xs text-gray-500 mt-0.5">{formatNumber(video.views)} views</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getOutlierBgColor(video.outlierScore)}`}>
                      {video.outlierScore.toFixed(1)}x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-white">Bottom 5 Performing</h3>
              </div>
              <div className="space-y-3">
                {bottom5.map((video, i) => (
                  <div key={video.id} className="flex items-start gap-3">
                    <span className="text-xs text-gray-500 mt-0.5 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-white hover:text-purple-400 transition-colors line-clamp-2">
                        {video.title}
                      </a>
                      <p className="text-xs text-gray-500 mt-0.5">{formatNumber(video.views)} views</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getOutlierBgColor(video.outlierScore)}`}>
                      {video.outlierScore.toFixed(1)}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Full table */}
      {loading ? <TableSkeleton rows={8} /> : filteredVideos.length > 0 ? <VideoTable videos={filteredVideos} /> : null}

      {!loading && filteredVideos.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No videos in this period. Try a longer range.</p>
          <button onClick={() => setPeriod('90')} className="mt-3 text-purple-400 hover:text-purple-300 text-sm">Show last 90 days</button>
        </div>
      )}
    </div>
  );
}
