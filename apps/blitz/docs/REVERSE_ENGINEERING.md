# Reverse-engineering Fastlane's Blitz Mode

## What was possible in this build

The network policy of the build sandbox blocked `usefastlane.ai` and `api.buffer.com`, so REA
([morluto/rea](https://github.com/morluto/rea), npm `rea-agents`) could not capture Fastlane's live bundle here.
Blitz also sits behind Fastlane's login, so a capture needs your signed-in browser anyway.
This implementation is built from:

1. Your screenshots of the Blitz screen and the Integrations settings.
2. Fastlane's public feature description: website analysis, Blitz swipe feed, multi-platform publishing.

Nothing below claims to come from Fastlane's code. Run the REA steps further down to confirm or correct it.

## Observed product behaviour → our implementation

| Fastlane (observed) | Blitz implementation |
|---|---|
| Paste website / app store / Shopify link; AI reads product, audience, tone | `POST /api/profile/analyze`: fetches the page, Claude returns `ProductProfile` (structured output); editable form |
| **Remixed From** panel: original viral post as a dark slideshow, hook in white pills, likes/views on the right, slide dots | `RemixedFrom.tsx` + `ViralReference` (`likes`/`views` only shown when real) |
| Chips: format (`Slideshow`) + green concept chip (`One Shoe, Full Day`) | `BlitzCard.format`, `BlitzCard.theme` |
| `Why This Content?` button with gradient border | `BlitzCard.why` popover |
| Stacked card deck, slightly rotated cards behind, image slides with TikTok-style white caption pills, prev/next arrows, orange active dot | `BlitzPage.tsx` stack + `Carousel` |
| ✕ / Edit / ✓ buttons with `←` / `→` key hints | Buttons, arrow keys, drag-to-swipe, `E` edit, `U` undo |
| Remix keeps the hook pattern: "Things you learn too late about people" → "Things you learn when one shoe has to handle your whole day" | Claude remix prompt in `server/services/ai.ts` keeps hook pattern, slide count and rhythm |
| Settings → Integrations: TikTok/YouTube/LinkedIn/Instagram cards, `Connect`, `+ Add Account`, yellow notes, `n/10 connections used` | `SettingsModal.tsx` Integrations section, backed by Buffer channels |
| Direct posting to platforms | Buffer `createPost` per channel; slides rendered server-side |

## Running REA against Fastlane yourself

REA's web tools attach to a Chrome you control over the DevTools protocol, so they see the app exactly as your
logged-in session does.

```bash
npm install --global rea-agents      # or prefix commands with: npx -y rea-agents@latest
rea doctor

# 1. Start Chrome with a debugging port and a separate profile, then log in to Fastlane and open Blitz
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.rea-chrome"

# 2. Find the Blitz tab
rea list-browser-targets http://127.0.0.1:9222

# 3. Capture + statically analyze the page bundle (swipe through a few cards while it observes)
rea analyze-web-bundle http://127.0.0.1:9222 <targetId> \
  --allowed-origins https://app.usefastlane.ai --observation-ms 20000 --fetch-source-maps --format json > blitz-bundle.json

# 4. Export the scripts and reconstruct modules/imports
rea export-web-scripts "$PWD/blitz-bundle.json" "$PWD/fastlane-scripts"
rea analyze-javascript-application "$PWD/fastlane-scripts" --json > blitz-app-graph.json

# 5. Record what happens on approve/reject/edit (network calls, payloads)
rea capture-browser-scenario --help   # bounded Playwright scenario with Evidence output
```

Use `--allowed-origins` with the origin Blitz actually runs on. Check the tab's URL from step 2.

What to look for, and where it plugs in here:

- **Feed endpoint and card schema.** Find the request that returns the next cards. Compare its fields with `BlitzCard` and `ViralReference` in `shared/types.ts`.
- **Where trending references come from.** Look for a scraping service or a curated library. Our equivalent is `server/services/library.ts` plus imported references.
- **Approve/reject side effects.** Check whether an approval schedules immediately or queues. Ours goes to the Approved tab, then to Buffer.
- **Rendering.** Check whether slides are rendered client-side (canvas) or server-side. Ours renders server-side, in `server/services/render.ts`.

Keep REA's Evidence JSON with your notes. Each conclusion in it carries its provenance and limits.
