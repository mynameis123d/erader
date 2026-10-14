import { describe, expect, it, vi } from "vitest";
import { crawlForPrompt, crawlSite, extractImages, heuristicFromCrawl } from "../server/services/website";
import { cardSources } from "../server/services/generator";
import type { ProductProfile, ViralReference } from "../shared/types";

const pages: Record<string, string> = {
  "https://stride.example/": `<html><head><title>Stride | All-day sneakers</title>
    <meta name="description" content="Sneakers that last from 8am to midnight">
    <meta property="og:image" content="https://cdn.stride.example/hero.jpg"></head><body>
    <img src="/logo.svg"><img src="/icons/cart.png" width="24">
    <h1>Walk all day without sore feet</h1>
    <a href="/products/stride-one">Stride One</a> <a href="/about">About</a> <a href="/cart">Cart</a>
    <a href="https://instagram.com/stride">IG</a> <a href="/privacy">Privacy</a></body></html>`,
  "https://stride.example/products/stride-one": `<html><head><title>Stride One</title>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Stride One","description":"Our all-day sneaker &amp; court shoe","image":["https://cdn.stride.example/one.jpg"],"offers":{"price":"129.00","priceCurrency":"USD"}}</script>
    </head><body><h2>Grip that works on the court</h2><img srcset="/img/one-400.jpg 400w, /img/one-1200.jpg 1200w" alt="Stride One side view"></body></html>`,
  "https://stride.example/about": `<html><head><title>About Stride</title></head><body><h2>Made for people who never sit down</h2></body></html>`,
};

const fakeFetch = vi.fn(async (url: string | URL) => {
  const html = pages[String(url)];
  return html ? new Response(html, { headers: { "content-type": "text/html" } }) : new Response("nope", { status: 404 });
});

describe("crawlSite", () => {
  it("reads the homepage plus product and about pages, skipping cart/privacy/offsite", async () => {
    const c = await crawlSite("stride.example", 6, fakeFetch as unknown as typeof fetch);
    expect(c.pages.map((p) => p.url)).toEqual(["https://stride.example/", "https://stride.example/products/stride-one", "https://stride.example/about"]);
    expect(fakeFetch.mock.calls.map((x) => String(x[0]))).not.toContain("https://stride.example/cart");
    expect(c.products).toEqual([{ name: "Stride One", description: "Our all-day sneaker & court shoe", price: "129.00 USD", image: "https://cdn.stride.example/one.jpg", url: "https://stride.example/products/stride-one" }]);
    const urls = c.images.map((i) => i.url);
    expect(urls).toContain("https://cdn.stride.example/hero.jpg");
    expect(urls).toContain("https://cdn.stride.example/one.jpg");
    expect(urls).toContain("https://stride.example/img/one-1200.jpg");
    expect(urls.some((u) => /logo|cart/.test(u))).toBe(false);
    expect(crawlForPrompt(c)).toContain("Stride One (129.00 USD)");
    const draft = heuristicFromCrawl(c);
    expect(draft.name).toBe("Stride");
    expect(draft.benefits).toContain("Grip that works on the court");
  });

  it("skips tiny and icon images", () => {
    expect(extractImages("https://x.com/", `<img src="/a.png" width="40"><img src="/favicon.png"><img src="/big.jpg">`).map((i) => i.url)).toEqual(["https://x.com/big.jpg"]);
  });
});

describe("card sources", () => {
  const profile = { url: "https://stride.example/", oneLiner: "x", site: { pages: ["https://stride.example/", "https://stride.example/about"], products: [], imageCount: 0, analyzedAt: "", analyzedBy: "claude" } } as unknown as ProductProfile;
  it("cites the website and the remixed post with its stats", () => {
    const ref = { id: "tiktok-1", platform: "tiktok", isTemplate: false, hook: "things you learn too late", views: 994100, likes: 98400, sourceUrl: "https://www.tiktok.com/@a/video/1" } as ViralReference;
    const s = cardSources(profile, ref, undefined);
    expect(s[0]).toMatchObject({ kind: "website", label: "Your website (2 pages read)", url: "https://stride.example/" });
    expect(s[1]).toMatchObject({ kind: "reference", url: "https://www.tiktok.com/@a/video/1" });
    expect(s[1].detail).toContain("994,100 views");
  });
  it("names the angle for Create New", () => {
    expect(cardSources(profile, undefined, "customer wins")[1]).toMatchObject({ kind: "angle", detail: "Content angle: customer wins" });
  });
});
