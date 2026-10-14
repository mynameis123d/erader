import type { ProfileDraft } from "./ai.js";

const MAX_TEXT = 20000;

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
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BlitzBot/0.1)", Accept: "text/html" },
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
