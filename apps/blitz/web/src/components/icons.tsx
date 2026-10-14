const LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "X",
  threads: "Threads",
  pinterest: "Pinterest",
};

export const serviceLabel = (s: string) => LABELS[s] ?? s;

export function serviceIcon(service: string, size = 22) {
  switch (service) {
    case "tiktok":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path fill="#25F4EE" d="M9.4 9.6v-.9a6.3 6.3 0 1 0 5.4 6.2V9.4a8 8 0 0 0 4.7 1.5V8.6a4.7 4.7 0 0 1-3.6-4.1h-2.3v10.7a2.6 2.6 0 1 1-2.6-2.8c.2 0 .5 0 .7.1V10a5.6 5.6 0 0 0-2.3-.4z" transform="translate(-.6 -.4)" />
          <path fill="#FE2C55" d="M9.4 9.6v-.9a6.3 6.3 0 1 0 5.4 6.2V9.4a8 8 0 0 0 4.7 1.5V8.6a4.7 4.7 0 0 1-3.6-4.1h-2.3v10.7a2.6 2.6 0 1 1-2.6-2.8c.2 0 .5 0 .7.1V10a5.6 5.6 0 0 0-2.3-.4z" transform="translate(.6 .4)" />
          <path fill="#000" d="M9.4 9.6v-.9a6.3 6.3 0 1 0 5.4 6.2V9.4a8 8 0 0 0 4.7 1.5V8.6a4.7 4.7 0 0 1-3.6-4.1h-2.3v10.7a2.6 2.6 0 1 1-2.6-2.8c.2 0 .5 0 .7.1V10a5.6 5.6 0 0 0-2.3-.4z" />
        </svg>
      );
    case "youtube":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <rect x="1.5" y="5" width="21" height="14" rx="4" fill="#FF0000" />
          <path d="M10 9l5.5 3-5.5 3z" fill="#fff" />
        </svg>
      );
    case "instagram":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#feda75" />
              <stop offset=".35" stopColor="#fa7e1e" />
              <stop offset=".6" stopColor="#d62976" />
              <stop offset="1" stopColor="#4f5bd5" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)" />
          <circle cx="12" cy="12" r="4.3" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="17.3" cy="6.7" r="1.2" fill="#fff" />
        </svg>
      );
    case "linkedin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
          <path fill="#fff" d="M7 10h2.3v7H7zm1.2-3.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM11 10h2.2v1c.4-.7 1.2-1.2 2.4-1.2 2.3 0 2.6 1.5 2.6 3.4V17h-2.3v-3.4c0-.9 0-1.9-1.2-1.9s-1.4.9-1.4 1.8V17H11z" />
        </svg>
      );
    default:
      return (
        <span className="svc-fallback" style={{ width: size, height: size }}>
          {serviceLabel(service).slice(0, 1)}
        </span>
      );
  }
}
