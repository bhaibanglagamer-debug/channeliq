'use client';

import { useEffect, useState } from 'react';
import { Idea, IdeaStatus } from '@/types';
import { KanbanBoard } from '@/components/KanbanBoard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Plus, X, Lightbulb, RefreshCw } from 'lucide-react';

export default function IdeaBankPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newHook, setNewHook] = useState('');
  const [newAngle, setNewAngle] = useState('');
  const [newViralScore, setNewViralScore] = useState('7');
  const [newTags, setNewTags] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ideas');
      const json = await res.json();
      setIdeas(json.ideas || []);
    } catch {
      setError('Failed to load ideas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  const handleUpdate = async (id: string, data: Partial<Idea>) => {
    const res = await fetch(`/api/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update');
    const json = await res.json();
    setIdeas((prev) => prev.map((i) => (i.id === id ? json.idea : i)));
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddIdea = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const tags = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          hook: newHook.trim(),
          angle: newAngle.trim(),
          viral_score: parseInt(newViralScore) || 7,
          status: 'Idea' as IdeaStatus,
          tags,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setIdeas((prev) => [json.idea, ...prev]);
        setShowAddModal(false);
        resetForm();
      }
    } catch {
      console.error('Failed to add idea');
    } finally {
      setAdding(false);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewHook('');
    setNewAngle('');
    setNewViralScore('7');
    setNewTags('');
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Idea Bank</h1>
          <p className="text-gray-400 text-sm">
            {ideas.length} idea{ideas.length !== 1 ? 's' : ''} saved · Drag to update status
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchIdeas}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Idea
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
              <SkeletonLoader className="h-5 w-24" />
              <SkeletonLoader className="h-24" />
              <SkeletonLoader className="h-20" />
              <SkeletonLoader className="h-16" />
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard ideas={ideas} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}

      {!loading && ideas.length === 0 && (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">No ideas yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
            Add ideas manually or generate them using the Idea Generator.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Idea
          </button>
        </div>
      )}

      {/* Add Idea Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Add Idea Manually</h2>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Video title idea"
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-purple-600 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Hook</label>
                <textarea
                  value={newHook}
                  onChange={(e) => setNewHook(e.target.value)}
                  placeholder="Opening hook for the video"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-purple-600 placeholder-gray-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Angle</label>
                <input
                  type="text"
                  value={newAngle}
                  onChange={(e) => setNewAngle(e.target.value)}
                  placeholder="Unique angle or differentiator"
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-purple-600 placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">
                    Viral Score (1–10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newViralScore}
                    onChange={(e) => setNewViralScore(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="make.com, tutorial"
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:border-purple-600 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIdea}
                disabled={adding || !newTitle.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? 'Adding...' : 'Add Idea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
