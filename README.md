# Viral Topic Finder

A Next.js web app to find viral content topics for YouTube channels. Analyzes channel performance, tracks competitor content, detects trends, and generates AI-powered video ideas.

## Features

- **Dashboard** — Channel analytics with outlier scoring, views charts, full video table
- **What's Working** — AI-classified topic clusters, scatter plots, top/bottom performers
- **Competitors** — Side-by-side comparison of competitor channels + AI gap detection
- **Idea Generator** — GPT-4o-mini powered viral idea generation with hooks and angles
- **Trend Radar** — Real-time trending keyword monitoring (last 7 vs 14 days)
- **Idea Bank** — Drag-and-drop kanban board (Idea → Scripting → Filmed → Live)

## Setup

### 1. Install dependencies

```bash
cd viral-topic-finder
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your keys:

```
YOUTUBE_API_KEY=your_youtube_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**Getting API keys:**
- YouTube Data API v3: [Google Cloud Console](https://console.cloud.google.com/) → Enable YouTube Data API v3 → Create credentials → API Key
- OpenAI: [platform.openai.com](https://platform.openai.com/api-keys)

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to `/dashboard`.

## YouTube API Quota

The YouTube Data API v3 has a daily quota of **10,000 units**. Here's approximate cost per action:
- Loading Dashboard (100 videos): ~200 units
- Loading Competitors (4 channels × 20 videos): ~400 units
- Trend Radar (6 keywords × 2 weeks): ~120 units

If you hit quota limits, the app shows a friendly error with a retry button.

## Idea Bank Storage

- **Development**: Ideas are stored in `data/ideas.json` (gitignored)
- **Production (Vercel)**: Ideas are stored in `/tmp/ideas.json` (ephemeral — resets on cold starts)

For persistent production storage, consider replacing `lib/ideas-store.ts` with a database (e.g., Vercel KV, PlanetScale, Supabase).

## Deployment (Vercel)

```bash
npm run build
vercel deploy
```

Add environment variables in Vercel dashboard under Settings → Environment Variables.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (dark mode)
- **Charts**: Recharts
- **AI**: OpenAI gpt-4o-mini
- **Data**: YouTube Data API v3
- **Drag & Drop**: @hello-pangea/dnd
