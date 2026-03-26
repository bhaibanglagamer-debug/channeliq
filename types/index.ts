export interface VideoData {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  outlierScore: number;
  thumbnail: string;
  durationSeconds?: number;
}

export interface CompetitorData {
  handle: string;
  channelId: string;
  channelTitle: string;
  videos: VideoData[];
  avgOutlierScore: number;
}

export type IdeaStatus = 'Idea' | 'Scripting' | 'Filmed' | 'Live';

export interface Idea {
  id: string;
  title: string;
  hook: string;
  angle: string;
  viral_score: number;
  status: IdeaStatus;
  tags: string[];
  youtube_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TopicCluster {
  topic: string;
  videos: VideoData[];
  avgOutlierScore: number;
  totalViews: number;
}

export interface Gap {
  topic: string;
  coveredBy: string[];
  suggestion: string;
}

export interface GeneratedIdea {
  title: string;
  hook: string;
  angle: string;
  viral_score: number;
}

export interface TrendKeywordResult {
  keyword: string;
  videos: VideoData[];
  totalViews: number;
  prevWeekTotalViews: number;
}

export interface KeywordBucket {
  label: string;
  periodStart: string;
  periodEnd: string;
  videos: VideoData[];
  totalViews: number;
  videoCount: number;
}

export interface TrendKeywordData {
  keyword: string;
  buckets: KeywordBucket[];
  latestViews: number;
  prevViews: number;
  changePercent: number;
  topVideo: VideoData | null;
}

export interface ClassificationResult {
  title: string;
  topic: string;
}
