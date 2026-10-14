import type { ProfileDraft } from "./ai.js";

const MAX_TEXT = 20000;

// Many stores (Shopify, Cloudflare-protected sites) refuse obvious bots, so ask like a normal browser.
export const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export interface PageSummary {
  url: string;
  title: string;
  description: string;
  headings: string[];
  text: string;
}

export function normalizeUrl(raw: string): URL {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  const url = new URL(withScheme);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs are supported");
  return url;
}

export async function fetchPage(rawUrl: string): Promise<PageSummary> {
  const url = normalizeUrl(rawUrl);
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Could not load ${url.host} (HTTP ${res.status})`);
  return summarizeHtml(url.toString(), await res.text());
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function meta(html: string, key: string): string {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "") : "";
}

export function summarizeHtml(url: string, html: string): PageSummary {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  const title = decode(cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || meta(html, "og:title");
  const description = meta(html, "description") || meta(html, "og:description");
  const headings = [...cleaned.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, " ")))
    .filter(Boolean)
    .slice(0, 30);
  const text = decode(cleaned.replace(/<[^>]+>/g, " ")).slice(0, MAX_TEXT);
  return { url, title, description, headings, text };
}

export function pageForPrompt(p: PageSummary): string {
  return [`Title: ${p.title}`, `Description: ${p.description}`, `Headings:\n- ${p.headings.join("\n- ")}`, `Body text:\n${p.text}`].join(
    "\n\n",
  );
}

/** Profile without an LLM, from the page's own metadata. The user can edit it afterwards. */
export function heuristicProfile(p: PageSummary): ProfileDraft {
  const host = new URL(p.url).hostname.replace(/^www\./, "");
  const name = (p.title.split(/[|\-–—:]/)[0] || host.split(".")[0]).trim();
  const words = `${p.title} ${p.description} ${p.headings.join(" ")}`.toLowerCase().match(/[a-z]{5,}/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  const keywords = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  return {
    name,
    oneLiner: p.description || p.headings[0] || `${name}`,
    audience: "People who need what this product does",
    tone: "friendly, direct, confident",
    painPoints: [],
    benefits: p.headings.slice(0, 4),
    keywords,
  };
}

// ---------------------------------------------------------------- multi-page crawl

export interface SiteImage {
  url: string;
  alt: string;
  page: string;
}

export interface SiteProduct {
  name: string;
  description?: string;
  price?: string;
  image?: string;
  url: string;
}

export interface SiteCrawl {
  root: string;
  pages: PageSummary[];
  images: SiteImage[];
  products: SiteProduct[];
}

type FetchLike = typeof fetch;

/** Paths worth reading to understand a product, best first. */
const PRIORITY_HIGH = /\/(products?|collections?|shop|features?|pricing|plans|solutions?)(\/|$|\?)/i;
const PRIORITY_LOW = /\/(about|our-story|how-it-works|faq|reviews?)(\/|$|\?)/i;
const rank = (u: string) => (PRIORITY_HIGH.test(u) ? 2 : PRIORITY_LOW.test(u) ? 1 : 0);
const SKIP = /\/(cart|checkout|account|login|signin|signup|register|privacy|terms|legal|cookie|careers|jobs|blog\/page)/i;

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];

/** Absolute same-site links from a page. */
export function extractLinks(baseUrl: string, html: string): string[] {
  const base = new URL(baseUrl);
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], base);
      if (u.host.replace(/^www\./, "") !== base.host.replace(/^www\./, "") || !/^https?:$/.test(u.protocol)) continue;
      if (SKIP.test(u.pathname) || /\.(pdf|zip|jpg|jpeg|png|gif|svg|webp|mp4)$/i.test(u.pathname)) continue;
      u.hash = "";
      out.add(u.toString());
    } catch {
      /* ignore malformed */
    }
  }
  return [...out];
}

/** Real product imagery: og/twitter images plus large content <img>s. Skips icons, logos, sprites and SVGs. */
export function extractImages(pageUrl: string, html: string): SiteImage[] {
  const base = new URL(pageUrl);
  const found: SiteImage[] = [];
  const push = (src: string | undefined, alt: string) => {
    if (!src || src.startsWith("data:")) return;
    try {
      const u = new URL(src.split(/\s+/)[0], base).toString();
      if (/\.svg(\?|$)|logo|icon|sprite|favicon|avatar|badge|payment|flag/i.test(u)) return;
      if (!found.some((f) => f.url === u)) found.push({ url: u, alt: decode(alt), page: pageUrl });
    } catch {
      /* ignore */
    }
  };
  for (const key of ["og:image", "twitter:image"]) {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"))?.[0];
    if (tag) push(attr(tag, "content"), "");
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const w = Number(attr(tag, "width") ?? 0);
    if (w && w < 300) continue;
    const srcset = attr(tag, "srcset") ?? attr(tag, "data-srcset");
    const best = srcset?.split(",").map((s) => s.trim()).pop();
    push(best ?? attr(tag, "data-src") ?? attr(tag, "src"), attr(tag, "alt") ?? "");
  }
  return found;
}

const absolute = (src: string | undefined, base: string) => {
  if (!src) return undefined;
  try {
    return new URL(src, base).toString();
  } catch {
    return undefined;
  }
};

/** schema.org Product data from JSON-LD blocks (Shopify and most stores ship this). */
export function extractProducts(pageUrl: string, html: string): SiteProduct[] {
  const out: SiteProduct[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const n = node as Record<string, unknown>;
    const type = n["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
      const offers = (Array.isArray(n.offers) ? n.offers[0] : n.offers) as Record<string, unknown> | undefined;
      const img = Array.isArray(n.image) ? n.image[0] : n.image;
      out.push({
        name: String(n.name ?? "").trim(),
        description: typeof n.description === "string" ? decode(n.description).slice(0, 300) : undefined,
        price: offers?.price ? `${offers.price} ${offers.priceCurrency ?? ""}`.trim() : undefined,
        image: absolute(typeof img === "string" ? img : typeof img === "object" && img ? (img as { url?: string }).url : undefined, pageUrl),
        url: pageUrl,
      });
    }
    if (n["@graph"]) visit(n["@graph"]);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(m[1]));
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return out.filter((p) => p.name);
}

async function getHtml(url: string, fetchImpl: FetchLike): Promise<{ url: string; html: string } | null> {
  try {
    const res = await fetchImpl(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "text/html").includes("html")) return null;
    return { url: res.url || url, html: await res.text() };
  } catch {
    return null;
  }
}

/** Read the homepage plus the most informative internal pages (products, features, pricing, about). */
export async function crawlSite(rawUrl: string, maxPages = 6, fetchImpl: FetchLike = fetch): Promise<SiteCrawl> {
  const root = normalizeUrl(rawUrl).toString();
  const home = await getHtml(root, fetchImpl);
  if (!home) throw new Error(`Could not load ${new URL(root).host}`);
  const links = extractLinks(home.url, home.html)
    .filter((l) => l !== home.url)
    .sort((a, b) => rank(b) - rank(a) || a.length - b.length)
    .slice(0, maxPages - 1);
  const rest = (await Promise.all(links.map((l) => getHtml(l, fetchImpl)))).filter((x): x is { url: string; html: string } => x !== null);
  const all = [home, ...rest];
  const products: SiteProduct[] = [];
  for (const p of all) for (const prod of extractProducts(p.url, p.html)) if (!products.some((x) => x.name === prod.name)) products.push(prod);
  const images: SiteImage[] = [];
  for (const p of all) for (const img of extractImages(p.url, p.html)) if (!images.some((x) => x.url === img.url)) images.push(img);
  for (const prod of products) if (prod.image && !images.some((x) => x.url === prod.image)) images.unshift({ url: prod.image, alt: prod.name, page: prod.url });
  return { root: home.url, pages: all.map((p) => summarizeHtml(p.url, p.html)), images: images.slice(0, 24), products: products.slice(0, 20) };
}

/** Everything the model reads about the site, page by page, within a size budget. */
export function crawlForPrompt(c: SiteCrawl, budget = 40000): string {
  const parts = [
    c.products.length ? `Products found:\n${c.products.map((p) => `- ${p.name}${p.price ? ` (${p.price})` : ""}${p.description ? `: ${p.description}` : ""}`).join("\n")}` : "",
    ...c.pages.map((p) => `=== ${p.url}\n${pageForPrompt({ ...p, text: p.text.slice(0, 6000) })}`),
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, budget);
}

/** Profile without an LLM, from every crawled page's metadata and the store's product data. */
export function heuristicFromCrawl(c: SiteCrawl): ProfileDraft {
  const home = heuristicProfile(c.pages[0]);
  const headings = c.pages.flatMap((p) => p.headings).filter((h) => h.length > 8 && h.length < 90);
  return {
    ...home,
    oneLiner: home.oneLiner || c.products[0]?.description || home.name,
    benefits: [...new Set(headings)].slice(0, 6),
    keywords: [...new Set([...c.products.slice(0, 3).map((p) => p.name.toLowerCase()), ...home.keywords])].slice(0, 10),
  };
}

/** True when a crawl found too little readable text, e.g. a JavaScript-only site. */
export function isThin(c: SiteCrawl): boolean {
  return c.pages.reduce((n, p) => n + p.text.length, 0) < 600;
}

/** Turn a page read through a real browser (Apify) into a crawl result. */
export function crawlFromMarkdown(page: { url: string; title: string; description: string; markdown: string }): SiteCrawl {
  const headings = [...page.markdown.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => m[1].replace(/[*_`]/g, "").trim()).slice(0, 30);
  const images = [...page.markdown.matchAll(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g)]
    .map((m) => ({ url: m[2], alt: m[1], page: page.url }))
    .filter((i) => !/\.svg(\?|$)|logo|icon|sprite|favicon|avatar|badge/i.test(i.url))
    .slice(0, 24);
  const text = page.markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
  return { root: page.url, pages: [{ url: page.url, title: page.title, description: page.description, headings, text: text.slice(0, MAX_TEXT) }], images, products: [] };
}
