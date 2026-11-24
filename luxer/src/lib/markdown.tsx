import React from "react";
import Link from "next/link";

/**
 * Renderizador Markdown mínimo e seguro (sem HTML bruto → sem XSS).
 * Suporta: ## títulos, ### subtítulos, parágrafos, listas (- e 1.), > citações, **negrito**, *itálico*, [links](url).
 */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[2]) out.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={k}>{m[3]}</em>);
    else if (m[4]) {
      const href = m[5];
      if (href.startsWith("/")) out.push(<Link key={k} href={href}>{m[4]}</Link>);
      else if (/^https?:\/\//.test(href)) out.push(<a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow">{m[4]}</a>);
      else out.push(m[4]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className = "prose-luxer" }: { source: string; className?: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((raw, bi) => {
        const block = raw.trim();
        if (!block) return null;
        const k = `b${bi}`;
        if (block.startsWith("### ")) return <h3 key={k}>{inline(block.slice(4), k)}</h3>;
        if (block.startsWith("## ")) return <h2 key={k}>{inline(block.slice(3), k)}</h2>;
        if (block.startsWith("# ")) return <h2 key={k}>{inline(block.slice(2), k)}</h2>;
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return <ul key={k}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*[-*] /, ""), `${k}-${li}`)}</li>)}</ul>;
        if (lines.every((l) => /^\s*\d+[.)] /.test(l)))
          return <ol key={k}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*\d+[.)] /, ""), `${k}-${li}`)}</li>)}</ol>;
        if (lines.every((l) => l.startsWith(">")))
          return <blockquote key={k}>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), k)}</blockquote>;
        return <p key={k}>{inline(lines.join(" "), k)}</p>;
      })}
    </div>
  );
}

export function plainExcerpt(source: string, max = 180): string {
  const t = source.replace(/[#>*_\[\]()-]/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}
