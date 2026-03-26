'use client';

import { GeneratedIdea } from '@/types';
import { getViralScoreColor } from '@/lib/utils';
import { Bookmark, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdeaCardProps {
  idea: GeneratedIdea;
  onSave?: (idea: GeneratedIdea) => void;
  saving?: boolean;
  saved?: boolean;
}

export function IdeaCard({ idea, onSave, saving, saved }: IdeaCardProps) {
  return (
    <div className="bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-white font-semibold text-sm leading-snug flex-1">{idea.title}</h3>
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border shrink-0', getViralScoreColor(idea.viral_score))}>
          <Zap className="w-3 h-3" />
          {idea.viral_score}/10
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-purple-400 mb-1">Hook</p>
          <p className="text-sm text-gray-300 leading-relaxed">{idea.hook}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-blue-400 mb-1">Angle</p>
          <p className="text-sm text-gray-400 leading-relaxed">{idea.angle}</p>
        </div>
      </div>

      {onSave && (
        <button
          onClick={() => onSave(idea)}
          disabled={saving || saved}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-colors border',
            saved
              ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-default'
              : 'bg-purple-600/20 text-purple-400 border-purple-600/30 hover:bg-purple-600/30 disabled:opacity-60'
          )}
        >
          <Bookmark className="w-4 h-4" />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save to Idea Bank'}
        </button>
      )}
    </div>
  );
}
