/** Built-in covers are CSS backgrounds so the app works fully offline. */
export const COVERS: Record<string, string> = {
  sunrise: "linear-gradient(120deg, #f6d365 0%, #fda085 100%)",
  ocean: "linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%)",
  dusk: "linear-gradient(120deg, #a18cd1 0%, #fbc2eb 100%)",
  forest: "linear-gradient(120deg, #0ba360 0%, #3cba92 100%)",
  lagoon: "linear-gradient(120deg, #43e97b 0%, #38f9d7 100%)",
  peach: "linear-gradient(120deg, #ffecd2 0%, #fcb69f 100%)",
  night: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  berry: "linear-gradient(120deg, #ee9ca7 0%, #ffdde1 100%)",
  aurora: "linear-gradient(120deg, #00c6fb 0%, #005bea 50%, #7f00ff 100%)",
  candy: "linear-gradient(120deg, #ff9a9e 0%, #fecfef 50%, #a1c4fd 100%)",
  ember: "linear-gradient(120deg, #f83600 0%, #f9d423 100%)",
  slate: "linear-gradient(120deg, #cfd9df 0%, #e2ebf0 100%)",
  red: "#e16259",
  yellow: "#f4c542",
  blue: "#4c8bf5",
  green: "#4dab9a",
  purple: "#9a6dd7",
  graphite: "#37352f",
  paper:
    "radial-gradient(circle at 20% 30%, rgba(255,255,255,.35) 0 8%, transparent 9%), radial-gradient(circle at 70% 60%, rgba(255,255,255,.25) 0 12%, transparent 13%), linear-gradient(120deg,#fbd786,#f7797d)",
  grid:
    "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(120deg,#667eea,#764ba2)",
};

export function coverStyle(cover: string | null): string | undefined {
  if (!cover) return undefined;
  if (COVERS[cover]) return COVERS[cover];
  if (/^https?:\/\//.test(cover) || cover.startsWith("data:image/"))
    return `center / cover no-repeat url("${cover.replace(/"/g, "%22")}")`;
  return undefined;
}

export const randomCover = () => {
  const keys = Object.keys(COVERS);
  return keys[Math.floor(Math.random() * keys.length)];
};
