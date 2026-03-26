'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Idea, IdeaStatus } from '@/types';
import { getViralScoreColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Zap, ExternalLink, Trash2 } from 'lucide-react';

const COLUMNS: IdeaStatus[] = ['Idea', 'Scripting', 'Filmed', 'Live'];

const COLUMN_COLORS: Record<IdeaStatus, string> = {
  Idea: 'border-purple-600/30',
  Scripting: 'border-blue-600/30',
  Filmed: 'border-yellow-600/30',
  Live: 'border-green-600/30',
};

const COLUMN_HEADER_COLORS: Record<IdeaStatus, string> = {
  Idea: 'text-purple-400',
  Scripting: 'text-blue-400',
  Filmed: 'text-yellow-400',
  Live: 'text-green-400',
};

interface KanbanBoardProps {
  ideas: Idea[];
  onUpdate: (id: string, data: Partial<Idea>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KanbanBoard({ ideas: initialIdeas, onUpdate, onDelete }: KanbanBoardProps) {
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [urlInputId, setUrlInputId] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState('');

  useEffect(() => {
    setIdeas(initialIdeas);
  }, [initialIdeas]);

  const byStatus = (status: IdeaStatus) => ideas.filter((i) => i.status === status);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as IdeaStatus;
    const updatedIdeas = ideas.map((idea) =>
      idea.id === draggableId ? { ...idea, status: newStatus } : idea
    );
    setIdeas(updatedIdeas);

    try {
      await onUpdate(draggableId, { status: newStatus });
    } catch {
      setIdeas(ideas); // Revert on error
    }
  };

  const handleUrlSave = async (id: string) => {
    await onUpdate(id, { youtube_url: urlValue });
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, youtube_url: urlValue } : i)));
    setUrlInputId(null);
    setUrlValue('');
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((status) => {
          const colIdeas = byStatus(status);
          return (
            <div key={status} className={cn('rounded-xl border bg-gray-900/50 flex flex-col', COLUMN_COLORS[status])}>
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className={cn('text-sm font-semibold', COLUMN_HEADER_COLORS[status])}>{status}</h3>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                  {colIdeas.length}
                </span>
              </div>
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 p-3 space-y-3 min-h-[200px] transition-colors rounded-b-xl',
                      snapshot.isDraggingOver ? 'bg-gray-800/50' : ''
                    )}
                  >
                    {colIdeas.map((idea, index) => (
                      <Draggable key={idea.id} draggableId={idea.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing transition-shadow',
                              snapshot.isDragging ? 'shadow-lg shadow-purple-900/20 border-purple-600/40' : 'hover:border-gray-700'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-white font-medium leading-snug flex-1">{idea.title}</p>
                              <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold border shrink-0', getViralScoreColor(idea.viral_score))}>
                                <Zap className="w-2.5 h-2.5" />
                                {idea.viral_score}
                              </span>
                            </div>

                            {idea.tags && idea.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {idea.tags.map((tag) => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {status === 'Live' && (
                              <div>
                                {idea.youtube_url ? (
                                  <a
                                    href={idea.youtube_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View on YouTube
                                  </a>
                                ) : urlInputId === idea.id ? (
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="url"
                                      value={urlValue}
                                      onChange={(e) => setUrlValue(e.target.value)}
                                      placeholder="https://youtu.be/..."
                                      className="flex-1 text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white outline-none focus:border-purple-600"
                                    />
                                    <button
                                      onClick={() => handleUrlSave(idea.id)}
                                      className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-500"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUrlInputId(idea.id);
                                      setUrlValue('');
                                    }}
                                    className="text-xs text-gray-500 hover:text-purple-400"
                                  >
                                    + Add YouTube URL
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(idea.id);
                                }}
                                className="text-gray-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
