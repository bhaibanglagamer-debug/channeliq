import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getOutlierColor(score: number): string {
  if (score >= 2.0) return 'text-green-400';
  if (score >= 0.8) return 'text-gray-400';
  return 'text-red-400';
}

export function getOutlierBgColor(score: number): string {
  if (score >= 2.0) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (score >= 0.8) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

export function getViralScoreColor(score: number): string {
  if (score >= 8) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (score >= 5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

export function daysAgo(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
