import { kvGet, kvSet } from './kv-store';
import { Idea } from '@/types';

const KEY = 'ideas:v1';

export async function readIdeas(): Promise<Idea[]> {
  return (await kvGet<Idea[]>(KEY)) ?? [];
}

export async function writeIdeas(ideas: Idea[]): Promise<void> {
  await kvSet(KEY, ideas); // no TTL = persist forever
}
