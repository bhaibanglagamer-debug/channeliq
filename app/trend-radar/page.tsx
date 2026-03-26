'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendKeywordData, VideoData } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Minus,
  Radio, Plus, X, Flame, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { clientGet, clientSet } from '@/lib/client-cache';

const DEFAULT_KEYWORDS = [
  'make.com', 'n8n', 'AI automation', 'AI agency',
  'no-code AI', 'AI agents', 'Claude AI', 'ChatGPT automation',
];

const KEYWORD_COLORS = [
  '#a855f7', '#3b82f6', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
  '#84cc16', '#ec4899',
];

type Weeks = '2' | '4' | '6';
const WEEKS_OPTIONS: { label: string; value: Weeks }[] = [
  { label: '2 weeks', value: '2' },
  { label: '4 weeks', value: '4' },
  { label: '6 weeks', value: '6' },
];

function pctClass(n: number) {
  if (n >= 30) return 'text-green-400';
  if (n <= -20) return 'text-red-400';
  return 'text-gray-400';
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct >= 50) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
      <Flame className="w-3 h-3" /> +{pct}% Hot
    </span>
  );
  if (pct >= 20) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <TrendingUp className="w-3 h-3" /> +{pct}% Rising
    </span>
  );
  if (pct <= -20) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
      <TrendingDown className="w-3 h-3" /> {pct}% Fading
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/50 text-gray-400 border border-gray-700">
      <Minus className="w-3 h-3" /> {pct >= 0 ? '+' : ''}{pct}%
    </span>
  );
}

// Build LineChart data: [{label: "4w ago", "make.com": 120000, n8n: 85000, ...}]
function buildChartData(keywords: TrendKeywordData[]): Record<string, string | number>[] {
  if (!keywords.length) return [];
  const labels = keywords[0].buckets.map((b) => b.label);
  return labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    keywords.forEach((kw) => {
      row[kw.keyword] = kw.buckets[i]?.totalViews ?? 0;
    });
    return row;
  });
}

export default function TrendRadarPage() {
  const [kwData, setKwData] = useState<TrendKeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [weeks, setWeeks] = useState<Weeks>('4');
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState('');
  const [expandedKw, setExpandedKw] = useState<string | null>(null);
  const [hiddenKws, setHiddenKws] = useState<Set<string>>(new Set());

  const cacheKey = `trend-v2:weeks=${weeks}:kw=${keywords.join(',')}`;

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cached = clientGet<{ keywords: TrendKeywordData[] }>(cacheKey);
      if (cached) {
        setKwData(cached.keywords);
        setExpandedKw(cached.keywords[0]?.keyword ?? null);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(
        `/api/youtube/search?weeks=${weeks}&keywords=${encodeURIComponent(keywords.join(','))}`
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        setError({ message: json.message || 'Failed to fetch trend data' });
        return;
      }
      const sorted: TrendKeywordData[] = (json.keywords || []).sort(
        (a: TrendKeywordData, b: TrendKeywordData) => b.latestViews - a.latestViews
      );
      setKwData(sorted);
      setExpandedKw(sorted[0]?.keyword ?? null);
      clientSet(cacheKey, { keywords: sorted }, 4 * 60 * 60 * 1000);
    } catch {
      setError({ message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [weeks, keywords, cacheKey]);

  useEffect(() => { fetchData(false); }, [weeks, keywords]);

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) return;
    setKeywords((prev) => [...prev, kw]);
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const toggleHidden = (kw: string) => {
    setHiddenKws((prev) => {
      const next = new Set(prev);
      next.has(kw) ? next.delete(kw) : next.add(kw);
      return next;
    });
  };

  const visibleKwData = kwData.filter((k) => !hiddenKws.has(k.keyword));
  const chartData = buildChartData(visibleKwData);
  const expandedData = kwData.find((k) => k.keyword === expandedKw);

  // Sort: hottest first
  const sortedKwData = [...kwData].sort((a, b) => b.changePercent - a.changePercent);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Trend Radar</h1>
          <p className="text-gray-400 text-sm">Track keyword momentum week-over-week in your niche</p>
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

      {/* Controls */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Week span */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">History</p>
            <div className="flex gap-2">
              {WEEKS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setWeeks(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    weeks === opt.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add keyword */}
          <div className="flex-1">
            <p className="text-xs text-gray-400 font-medium mb-2">Add Keyword</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                placeholder="e.g. Zapier, Cursor AI, Voiceflow..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-purple-600 placeholder-gray-500"
              />
              <button
                onClick={addKeyword}
                disabled={!newKeyword.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Keyword pills — click to toggle visibility on chart */}
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw, i) => {
            const color = KEYWORD_COLORS[i % KEYWORD_COLORS.length];
            const isHidden = hiddenKws.has(kw);
            return (
              <button
                key={kw}
                onClick={() => toggleHidden(kw)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isHidden ? 'opacity-30 grayscale' : ''
                }`}
                style={{ color, borderColor: color + '50', background: color + '15' }}
                title={isHidden ? 'Click to show' : 'Click to hide from chart'}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {kw}
                <span
                  onClick={(e) => { e.stopPropagation(); removeKeyword(kw); }}
                  className="ml-0.5 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>
        {hiddenKws.size > 0 && (
          <p className="text-xs text-gray-500 mt-2">Click a keyword pill to show/hide it on the chart</p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1"><p className="text-sm">{error.message}</p></div>
          <button onClick={() => fetchData(true)} className="text-xs px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">Retry</button>
        </div>
      )}

      {/* Main trend line chart */}
      {loading ? (
        <SkeletonLoader className="h-80 mb-6" />
      ) : chartData.length > 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-white">Weekly View Volume by Keyword</h3>
            <span className="text-xs text-gray-500">Total views on top 8 videos per keyword per week</span>
          </div>
          <p className="text-xs text-gray-600 mb-5">Click keywords in the legend or pills above to focus</p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatNumber(v)}
                width={60}
              />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '10px', padding: '10px 14px' }}
                labelStyle={{ color: '#f9fafb', fontWeight: 600, marginBottom: 6 }}
                itemStyle={{ fontSize: 12 }}
                formatter={(value: number, name: string) => [formatNumber(value) + ' views', name]}
                itemSorter={(item) => -(item.value as number)}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
                iconType="circle"
                iconSize={8}
              />
              {visibleKwData.map((kw, i) => {
                const allIdx = keywords.indexOf(kw.keyword);
                const color = KEYWORD_COLORS[allIdx % KEYWORD_COLORS.length];
                const isExpanded = expandedKw === kw.keyword;
                return (
                  <Line
                    key={kw.keyword}
                    type="monotone"
                    dataKey={kw.keyword}
                    stroke={color}
                    strokeWidth={isExpanded ? 3 : 1.5}
                    strokeOpacity={isExpanded || !expandedKw ? 1 : 0.35}
                    dot={{ r: isExpanded ? 5 : 3, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: color, onClick: () => setExpandedKw(kw.keyword) }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Keyword stat cards — sorted by momentum */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonLoader key={i} className="h-28" />)
        ) : (
          sortedKwData.map((kw, i) => {
            const allIdx = keywords.indexOf(kw.keyword);
            const color = KEYWORD_COLORS[allIdx % KEYWORD_COLORS.length];
            const isActive = expandedKw === kw.keyword;
            return (
              <button
                key={kw.keyword}
                onClick={() => setExpandedKw(isActive ? null : kw.keyword)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  isActive ? 'border-purple-500/50 bg-purple-500/5' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium text-white truncate">{kw.keyword}</span>
                  </div>
                  {i === 0 && <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                </div>
                <p className="text-xl font-bold text-white mb-0.5">{formatNumber(kw.latestViews)}</p>
                <p className="text-xs text-gray-500 mb-2">views this week · {kw.buckets[kw.buckets.length - 1]?.videoCount ?? 0} videos</p>
                <TrendBadge pct={kw.changePercent} />
              </button>
            );
          })
        )}
      </div>

      {/* Expanded keyword — top videos + week breakdown */}
      {!loading && expandedData && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Radio className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">&ldquo;{expandedData.keyword}&rdquo; — Weekly Breakdown</h3>
          </div>

          {/* Week-by-week stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {expandedData.buckets.map((bucket, i) => {
              const prev = i > 0 ? expandedData.buckets[i - 1].totalViews : 0;
              const pct = prev > 0 ? Math.round(((bucket.totalViews - prev) / prev) * 100) : 0;
              const isLatest = i === expandedData.buckets.length - 1;
              return (
                <div key={bucket.label} className={`rounded-lg border p-3 ${isLatest ? 'border-purple-500/30 bg-purple-500/5' : 'border-gray-800'}`}>
                  <p className="text-xs text-gray-400 mb-1">{bucket.label}</p>
                  <p className="text-base font-bold text-white">{formatNumber(bucket.totalViews)}</p>
                  <p className="text-xs text-gray-500">{bucket.videoCount} videos</p>
                  {i > 0 && (
                    <p className={`text-xs font-medium mt-1 ${pctClass(pct)}`}>
                      {pct >= 0 ? '+' : ''}{pct}% vs prior week
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Top videos this week */}
          {expandedData.buckets[expandedData.buckets.length - 1]?.videos.length > 0 && (
            <>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Videos This Week</h4>
              <div className="space-y-3">
                {expandedData.buckets[expandedData.buckets.length - 1].videos.slice(0, 5).map((video, i) => (
                  <div key={video.id} className="flex items-start gap-3">
                    <span className="text-xs text-gray-600 mt-1 w-4 shrink-0">{i + 1}</span>
                    {video.thumbnail && (
                      <img src={video.thumbnail} alt="" className="w-20 h-12 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white hover:text-purple-400 transition-colors line-clamp-2"
                      >
                        {video.title}
                      </a>
                      <p className="text-xs text-gray-500 mt-0.5">{formatNumber(video.views)} views</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!loading && kwData.length === 0 && !error && (
        <div className="text-center py-20">
          <Radio className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No trend data found for these keywords.</p>
        </div>
      )}
    </div>
  );
}
