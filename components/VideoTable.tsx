'use client';

import { VideoData } from '@/types';
import { formatNumber, formatDate, getOutlierBgColor } from '@/lib/utils';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';

type SortKey = 'title' | 'views' | 'likes' | 'comments' | 'publishedAt' | 'outlierScore';

interface VideoTableProps {
  videos: VideoData[];
  showThumbnail?: boolean;
}

export function VideoTable({ videos, showThumbnail = false }: VideoTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('outlierScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const perPage = 20;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const sorted = [...videos].sort((a, b) => {
    let aVal: number | string = a[sortKey];
    let bVal: number | string = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const paged = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="ml-1 opacity-20 text-xs">↕</span>;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1 text-violet-400" />
      : <ChevronDown className="w-3 h-3 inline ml-1 text-violet-400" />;
  };

  const th = (label: string, key: SortKey) => (
    <th
      className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-200 whitespace-nowrap transition-colors"
      onClick={() => handleSort(key)}
    >
      {label}
      <SortIcon k={key} />
    </th>
  );

  const getOutlierStyle = (score: number) => {
    if (score >= 3) return { background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa' };
    if (score >= 1.5) return { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' };
    if (score >= 0.8) return { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' };
    return { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' };
  };

  return (
    <div
      className="rounded-2xl overflow-hidden card-accent"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <tr>
              <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
              {showThumbnail && (
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Thumb</th>
              )}
              {th('Title', 'title')}
              {th('Views', 'views')}
              {th('Likes', 'likes')}
              {th('Comments', 'comments')}
              {th('Published', 'publishedAt')}
              {th('Outlier', 'outlierScore')}
            </tr>
          </thead>
          <tbody>
            {paged.map((video, i) => (
              <tr
                key={video.id}
                className="transition-colors group"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-4 py-3 text-xs text-gray-600 font-mono">{page * perPage + i + 1}</td>
                {showThumbnail && (
                  <td className="px-4 py-3">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-16 h-9 rounded-lg object-cover"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    ) : (
                      <div className="w-16 h-9 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    )}
                  </td>
                )}
                <td className="px-4 py-3 max-w-xs">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-200 hover:text-violet-400 transition-colors line-clamp-2 flex items-start gap-1.5 group/link"
                  >
                    <span className="flex-1">{video.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-60 transition-opacity" />
                  </a>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap font-medium">{formatNumber(video.views)}</td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatNumber(video.likes)}</td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatNumber(video.comments)}</td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(video.publishedAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={getOutlierStyle(video.outlierScore)}
                  >
                    {video.outlierScore.toFixed(2)}x
                  </span>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={showThumbnail ? 8 : 7} className="px-4 py-12 text-center text-gray-600 text-sm">
                  No videos found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs text-gray-600">
            {page * perPage + 1}–{Math.min((page + 1) * perPage, sorted.length)} of {sorted.length} videos
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
