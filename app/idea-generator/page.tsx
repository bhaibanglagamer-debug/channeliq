'use client';

import { useEffect, useState } from 'react';
import { GeneratedIdea, VideoData, CompetitorData, TopicCluster, ClassificationResult } from '@/types';
import { IdeaCard } from '@/components/IdeaCard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Sparkles, RefreshCw, AlertTriangle, Users, BarChart2 } from 'lucide-react';
import { clientGet } from '@/lib/client-cache';

interface ContextState {
  topVideos: string[];
  competitorVideos: { channel: string; title: string; views: number }[];
  topTopics: string[];
  gaps: string[];
}

function buildContext(): ContextState {
  // Pull Michele's top videos
  const channelData = clientGet<{ videos: VideoData[] }>('channel-data');
  const topVideos = channelData
    ? [...channelData.videos].sort((a, b) => b.outlierScore - a.outlierScore).slice(0, 10).map((v) => v.title)
    : [];

  // Pull competitor videos
  const compData = clientGet<{ competitors: CompetitorData[] }>('competitors-data');
  const competitorVideos = compData
    ? compData.competitors.flatMap((c) =>
        c.videos.map((v) => ({ channel: c.handle.replace('@', ''), title: v.title, views: v.views }))
      )
    : [];

  // Pull topic clusters
  const analysisData = clientGet<{ videos: VideoData[]; classifications: ClassificationResult[] }>('whats-working-data');
  let topTopics: string[] = [];
  if (analysisData?.classifications?.length && analysisData?.videos?.length) {
    const classMap = new Map(analysisData.classifications.map((c) => [c.title, c.topic]));
    const groups: Record<string, VideoData[]> = {};
    analysisData.videos.forEach((v) => {
      const topic = classMap.get(v.title) || 'Other';
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(v);
    });
    topTopics = Object.entries(groups)
      .map(([topic, vids]) => ({
        topic,
        avg: vids.reduce((s, v) => s + v.outlierScore, 0) / vids.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map((t) => `${t.topic} (${t.avg.toFixed(1)}x avg outlier)`);
  }

  return { topVideos, competitorVideos, topTopics, gaps: [] };
}

export default function IdeaGeneratorPage() {
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [generating, setGenerating] = useState(false);
  const [constraints, setConstraints] = useState('');
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ContextState>({ topVideos: [], competitorVideos: [], topTopics: [], gaps: [] });
  const [contextLoaded, setContextLoaded] = useState(false);

  // Build context from cached data
  useEffect(() => {
    const ctx = buildContext();
    setContext(ctx);
    setContextLoaded(true);
  }, []);

  const generateIdeas = async () => {
    setGenerating(true);
    setError(null);
    setSavedIds([]);
    try {
      const res = await fetch('/api/openai/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topVideos: context.topVideos,
          competitorVideos: context.competitorVideos,
          gaps: context.gaps,
          topTopics: context.topTopics,
          constraints,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.message || 'Failed to generate ideas');
        return;
      }
      setIdeas(json.ideas || []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const saveIdea = async (idea: GeneratedIdea, index: number) => {
    setSavingIds((prev) => [...prev, index]);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: idea.title, hook: idea.hook, angle: idea.angle, viral_score: idea.viral_score, status: 'Idea', tags: [] }),
      });
      if (res.ok) setSavedIds((prev) => [...prev, index]);
    } catch {
      console.error('Failed to save idea');
    } finally {
      setSavingIds((prev) => prev.filter((i) => i !== index));
    }
  };

  const hasChannelData = context.topVideos.length > 0;
  const hasCompetitorData = context.competitorVideos.length > 0;
  const hasTopicData = context.topTopics.length > 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Idea Generator</h1>
        <p className="text-gray-400 text-sm">AI ideas informed by your channel + competitors</p>
      </div>

      {/* Context status */}
      {contextLoaded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${hasChannelData ? 'bg-green-500/5 border-green-500/20' : 'bg-gray-900 border-gray-800'}`}>
            <BarChart2 className={`w-4 h-4 shrink-0 ${hasChannelData ? 'text-green-400' : 'text-gray-600'}`} />
            <div>
              <p className={`text-xs font-medium ${hasChannelData ? 'text-green-400' : 'text-gray-500'}`}>
                {hasChannelData ? `${context.topVideos.length} top videos loaded` : 'No channel data'}
              </p>
              <p className="text-xs text-gray-500">Michele&apos;s performance</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${hasCompetitorData ? 'bg-blue-500/5 border-blue-500/20' : 'bg-gray-900 border-gray-800'}`}>
            <Users className={`w-4 h-4 shrink-0 ${hasCompetitorData ? 'text-blue-400' : 'text-gray-600'}`} />
            <div>
              <p className={`text-xs font-medium ${hasCompetitorData ? 'text-blue-400' : 'text-gray-500'}`}>
                {hasCompetitorData ? `${context.competitorVideos.length} competitor videos` : 'No competitor data'}
              </p>
              <p className="text-xs text-gray-500">Niche trends</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${hasTopicData ? 'bg-purple-500/5 border-purple-500/20' : 'bg-gray-900 border-gray-800'}`}>
            <Sparkles className={`w-4 h-4 shrink-0 ${hasTopicData ? 'text-purple-400' : 'text-gray-600'}`} />
            <div>
              <p className={`text-xs font-medium ${hasTopicData ? 'text-purple-400' : 'text-gray-500'}`}>
                {hasTopicData ? `${context.topTopics.length} topic clusters` : 'No topic analysis'}
              </p>
              <p className="text-xs text-gray-500">What&apos;s working</p>
            </div>
          </div>
        </div>
      )}

      {(!hasChannelData || !hasCompetitorData) && contextLoaded && (
        <div className="mb-5 p-3.5 rounded-xl border bg-yellow-500/5 border-yellow-500/20 text-yellow-400 text-xs">
          💡 Visit <strong>Dashboard</strong> and <strong>Competitors</strong> first to load data — ideas will be much more accurate.
        </div>
      )}

      {/* Generate controls */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <label className="block text-xs text-gray-400 font-medium mb-1.5">
          Constraints / Focus (optional)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !generating && generateIdeas()}
            placeholder="e.g. 'Make.com beginners only' or 'AI agency case studies'"
            className="flex-1 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-purple-600 placeholder-gray-500"
          />
          <button
            onClick={generateIdeas}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Generate 10 Ideas'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Skeletons while generating */}
      {generating && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
              <SkeletonLoader className="h-5 w-full" />
              <SkeletonLoader className="h-4 w-5/6" />
              <SkeletonLoader className="h-4 w-4/6" />
              <SkeletonLoader className="h-8 w-full mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Ideas */}
      {!generating && ideas.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">{ideas.length} ideas · {savedIds.length} saved</p>
            <button
              onClick={() => ideas.forEach((idea, i) => { if (!savedIds.includes(i)) saveIdea(idea, i); })}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Save all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ideas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} onSave={(idea) => saveIdea(idea, i)} saving={savingIds.includes(i)} saved={savedIds.includes(i)} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!generating && ideas.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Ready to generate</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            {hasChannelData && hasCompetitorData
              ? 'All data loaded. Hit Generate for ideas based on your channel + what competitors are doing.'
              : 'Hit Generate — load Dashboard + Competitors first for better results.'}
          </p>
        </div>
      )}
    </div>
  );
}
