# Blitz Mode

A swipe-to-approve feed of AI-remixed short-form content, modeled on Fastlane's Blitz Mode.
Approved posts are rendered to slides or video and published to **TikTok, Instagram and
YouTube Shorts** through **Buffer**.

```
paste your URL ──▶ brand profile ──▶ Blitz feed ──▶ ✓ approve / ✕ skip / ✎ edit ──▶ Approved ──▶ Publish via Buffer
                   (Claude reads         (viral formats remixed
                    your site)            for your product)
```

## Quick start

```bash
cd apps/blitz
cp .env.example .env      # then fill in the keys (see below)
npm install
npm run dev               # API on :8787, UI on http://localhost:5173
```

Production: `npm run build && npm start` serves the UI and API from one port.

## Keys and settings (`apps/blitz/.env`)

`.env` is git-ignored. Keys stay on the server and never reach the browser.

| Variable | Needed for | Without it |
|---|---|---|
| `BUFFER_API_KEY` | Listing channels and creating posts | Publishing is disabled. You can still export the media. |
| `PUBLIC_BASE_URL` | Buffer downloads media from this server, so it must be reachable from the internet: a deployment, or a tunnel like `cloudflared tunnel --url http://localhost:8787` | Publishing is refused with a clear error |
| `ANTHROPIC_API_KEY` | Reading your website and writing remixes with Claude | Built-in templates with your product name filled in |
| `PEXELS_API_KEY` | **Background videos** for Wall of Text posts + photos for slides (free key) | Videos: a slowly zooming painted scene. Photos: Openverse public-domain search |
| `PIXABAY_API_KEY` | Second free source of background videos | Pexels only |
| `APIFY_TOKEN` | Settings → Remix library → **Pull trending**: imports the most-viewed TikToks for your topics (real hooks and stats) | Built-in formats + posts you add by hand |
| `BUFFER_ORGANIZATION_ID` | Optional: pin a Buffer org | The first org on the account is used |

## Using it

- **Formats**: *Wall of Text* (a stock video clip matched to the text, with outlined white text over it, rendered to a 7-15 s MP4) and *Slideshow* (photo slides with TikTok-style caption pills). With a video key, half of each batch is Wall of Text.
- **One click**: Settings → One-click publishing → turn on and pick your TikTok, Instagram and YouTube channels. From then on, ✓ renders the post and sends it to Buffer (queue or immediately). Results show under Approved → Sent to Buffer.
- **Blitz tab**: `→` or ✓ approves, `←` or ✕ skips, `E` edits, `U` undoes. You can also drag the card left or right.
  The left panel shows the format being remixed. "Why This Content?" explains the pick.
  The feed tops itself up when fewer than 3 cards are left.
- **Edit**: change slide text and text position, swap or upload images, add, reorder or delete slides, and edit the caption and hashtags. The preview uses the same proportions as the exported PNGs.
- **Approved tab → Publish**: pick Buffer channels, then choose queue, now or a scheduled time.
  - TikTok: photo carousel at 1080×1920, or video if you tick the box
  - Instagram: carousel at 1080×1350, or a Reel at 1080×1920
  - YouTube: always a Short (MP4 at 1080×1920, 3 s per slide, built with ffmpeg)
- **Settings → Integrations**: shows the Buffer status and which TikTok, YouTube and Instagram accounts are connected.
  You connect the accounts in Buffer itself, since Buffer's API can't connect them. **Remix library**: add a viral post you've
  seen (hook, slides, views and likes). It gets used first, and its stats show in "Remixed From".

## Layout

```
server/
  app.ts                 REST API (Express)
  services/buffer.ts     Buffer GraphQL client (every Buffer query is in this file)
  services/ai.ts         Claude: site analysis + remix (structured output)
  services/generator.ts  Turns a viral reference and your profile into a BlitzCard
  services/library.ts    Built-in viral formats
  services/render.ts     PNG slides (@napi-rs/canvas) + MP4 (ffmpeg)
  services/publisher.ts  Picks media per platform, renders it, then creates the Buffer posts
web/src/                 React UI (BlitzPage, EditModal, QueuePage, SettingsModal)
shared/types.ts          Types shared by API and UI
data/                    db.json + rendered media (git-ignored)
```

## Preview build

`npm run build:preview` writes `preview/index.html`, a single self-contained page of the real UI running on an
in-browser stand-in API with sample cards (no network, nothing posted).

## Network

The server calls `api.buffer.com`, `api.pexels.com` (+ `videos.pexels.com`, `images.pexels.com`), `pixabay.com`,
`api.openverse.org`, `api.apify.com` and `api.anthropic.com`. If you run it somewhere with an outbound allowlist, allow those hosts.

## Notes

- Trending posts from Apify are used as references only (hook, format, stats). Background footage always comes from
  Pexels/Pixabay, which license clips for commercial use. Re-uploading other creators' videos would break copyright
  and gets down-ranked as duplicate content.

- The Buffer client targets Buffer's GraphQL API (`https://api.buffer.com`, Bearer key). The sandbox this was built in
  couldn't reach Buffer, so run Settings → Integrations → Refresh once with your key. If Buffer rejects a field,
  the exact GraphQL error appears there and in the publish log, and only `server/services/buffer.ts` needs changing.
- Library formats are format templates, not copies of specific posts, so they show no view counts. Real numbers
  only appear for posts you import.
- Tests: `npm test` covers the Buffer client with a mocked HTTP layer, the publishing plan, remixing, website parsing and rendering.
