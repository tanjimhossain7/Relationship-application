# Underpantmaru

A private little app for Tanzim and Azrina (together since April 22, 2024). It's a web app you add to your iPhone home screen, so it opens full screen like a normal app.

**What's inside**

- **Who's this?** First open asks if you're Tanzim or Azrina. Tanzim gets dark blue, Azrina gets dark green. Tanzim's picture is the motorcycle Badtzmaru from the picture library once it's uploaded (Badtzmaru in underpants until then).
- **Home tiles** show a live preview of each section (latest covers, the games score bar, the newest thought, your favorite restaurant) and a little "N new" badge when the other person adds something.
- **Weekly picture**: each of you picks one picture a week for the other. It's the first thing they see, and they can't get into the app until they open it. Picks older than 4 weeks are deleted automatically.
- **Music**: opens on big cover art and a Spotify preview of the latest songs. Send each other Spotify links, share what you're into lately. Links open in Spotify. Optional "Connect Spotify" adds one-tap Now playing / Recently played; nothing is ever shared unless you tap share.
- **Moments**: birthdays, tournaments, dates, parties, trips. Countdowns for what's coming up, plus Memories: "this time last year", random memory, this month in other years. **Bulk add** lets you paste lots of past events at once (`2024-05-10 | Title | type | notes`).
- **Propose a date**: fill in what, where and when. The other person gets it as a pop-up next time they open the app and taps Yes or Maybe, I have to check. A yes drops it into Moments, and the proposer gets told the answer.
- **Photobooth**: every photobooth strip, upload many at once.
- **Games**: Krillion, Wordle, Globle, Spotle, Spotle Movie, Connections. Paste your share text and it reads the score (or just type it). Head-to-head only counts days you both played, so skipping never costs you.
- **Thoughtboard**: random thoughts for the other one to find, with reactions and unread badges.
- **Eats**: favorites first, every visit, Tanzim's rating and review, Azrina's, and the average, grouped by place. Eat out back to back and it roasts you.
- **Movies**: every movie you saw together, with posters found automatically from Wikipedia (add the year if it picks the wrong one).
- **Streaks**: log in daily. 7, 10, 15, 20, 25 and every 30 days pop a celebration (only when you hit it).
- **Surprises**: roughly once a week, Badtzmaru runs across the screen, it rains underpants, or Badtzmaru rides a motorcycle over Peace Bridge.
- **Picture library** (More → only visible to Tanzim): upload pictures for each streak and surprise. Until then, emoji placeholders are used. There are also preview buttons for the surprises.

## Deploying (about 15 minutes, all free)

### 1. Supabase (the shared database and photo storage)

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name, set a database password (you won't need it in the app), choose the region closest to you.
2. When it's ready, open **SQL Editor → New query**, paste everything from [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and press **Run**. Then do the same with [`0002_date_ideas.sql`](supabase/migrations/0002_date_ideas.sql) and [`0003_movies.sql`](supabase/migrations/0003_movies.sql). This creates all the tables and the `photos` storage bucket.
3. Open **Project Settings → API** (or **Connect**) and keep two values handy:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon / publishable key** (the long public one, *not* the `service_role` secret)

### 2. Vercel (the hosting)

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import `tanjimhossain7/Relationship-application`.
2. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon / publishable key |
   | `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | optional, see step 4 |

3. Click **Deploy**. You get a link like `https://relationship-application.vercel.app`.

If you add or change an env var later: Vercel → Project → **Settings → Environment Variables**, then **Deployments → ⋯ → Redeploy** (env vars are baked in at build time).

### 3. Put it on both iPhones

Open the link in **Safari** → tap **Share** → **Add to Home Screen**. Open it from the home screen icon and pick who you are.

### 4. Optional: Connect Spotify (now playing)

Sending Spotify links works without this. To also get one-tap "Now playing" / "Recently played":

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → **Create app**.
2. Redirect URI: `https://YOUR-VERCEL-LINK/music/callback` (exact, including `/music/callback`). Tick **Web API**.
3. In the app's **User Management**, add both of your Spotify account emails (apps in development mode only work for listed users).
4. Copy the **Client ID** into Vercel as `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` and redeploy.
5. In the app: **Music → Connect Spotify**. Each person connects on their own phone, and it only reads what's playing when you tap the button.

## Privacy note

There's no login by design. Anyone with the link and the app open can see and add things, and the Supabase anon key is public by nature. Don't post the link anywhere. The repo itself contains no keys.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in values, or leave blank for demo mode
npm run dev
```

With no Supabase env vars the app runs in **demo mode**: it works fully but saves only in that browser.

## Tweaking

- Roast lines: `lib/roasts.ts`
- Streak milestones and messages: `lib/streaks.ts`
- Games, scoring direction and paste parsing: `lib/games.ts`
- Colors and fonts: `app/globals.css`, `app/layout.tsx`
- App icon: `app/icon.png`, `app/apple-icon.png`, `public/icons/`
