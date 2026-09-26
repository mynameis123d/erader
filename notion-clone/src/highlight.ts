import { escapeHtml } from "./utils";

const KEYWORDS = new Set(
  (
    "abstract as async await break case catch class const continue def default del delete do elif else enum export extends false " +
    "final finally fn for from func function go if impl implements import in instanceof interface is lambda let loop match mod module " +
    "mut new nil None not null or package pass private protected pub public raise return self static struct super switch this throw " +
    "true True False try type typeof undefined use var void while with yield select insert update where join on group by order limit " +
    "create table values into and SELECT FROM WHERE INSERT UPDATE DELETE JOIN ON GROUP BY ORDER LIMIT CREATE TABLE VALUES INTO AND OR echo then fi esac"
  ).split(" "),
);

const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|#(?![{\w-]*[:{])[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|(<\/?[a-zA-Z][\w-]*|\/?>)/g;

export function highlight(code: string, lang = "plain"): string {
  if (lang === "plain" || lang === "markdown") return escapeHtml(code);
  const hashComments = ["python", "bash", "yaml"].includes(lang);
  let out = "";
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    out += escapeHtml(code.slice(last, idx));
    last = idx + m[0].length;
    const [tok, comment, str, num, fn, word, tag] = m;
    if (comment) {
      if (comment.startsWith("#") && !hashComments) {
        // `#` only starts comments in shell-like languages; elsewhere re-scan it as plain text.
        out += escapeHtml(tok[0]);
        last = idx + 1;
        continue;
      }
      out += `<span class="tk-c">${escapeHtml(tok)}</span>`;
    } else if (str) out += `<span class="tk-s">${escapeHtml(tok)}</span>`;
    else if (num) out += `<span class="tk-n">${tok}</span>`;
    else if (fn) out += KEYWORDS.has(fn) ? `<span class="tk-k">${fn}</span>` : `<span class="tk-f">${fn}</span>`;
    else if (word) out += KEYWORDS.has(word) ? `<span class="tk-k">${word}</span>` : /^[A-Z]/.test(word) ? `<span class="tk-t">${word}</span>` : word;
    else if (tag) out += `<span class="tk-k">${escapeHtml(tok)}</span>`;
    else out += escapeHtml(tok);
  }
  out += escapeHtml(code.slice(last));
  return out;
}
