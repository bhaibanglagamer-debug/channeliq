/**
 * Unified persistent storage.
 * - Production (Vercel + KV env vars set): uses Vercel KV (Redis)
 * - Local dev / Vercel without KV: falls back to local JSON files in /data
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Lazy-load Vercel KV only when env vars are present
async function getKV() {
  const { kv } = await import('@vercel/kv');
  return kv;
}

function localPath(key: string): string {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, key.replace(/[:/]/g, '_') + '.json');
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (useKV) {
    const kv = await getKV();
    return kv.get<T>(key);
  }
  const path = localPath(key);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    const entry = JSON.parse(raw) as { value: T; expiresAt?: number };
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      unlinkSync(path);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (useKV) {
    const kv = await getKV();
    if (ttlSeconds) {
      await kv.set(key, value, { ex: ttlSeconds });
    } else {
      await kv.set(key, value);
    }
    return;
  }
  const path = localPath(key);
  const entry = {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
  };
  writeFileSync(path, JSON.stringify(entry, null, 2), 'utf-8');
}

export async function kvDel(key: string): Promise<void> {
  if (useKV) {
    const kv = await getKV();
    await kv.del(key);
    return;
  }
  const path = localPath(key);
  if (existsSync(path)) unlinkSync(path);
}
