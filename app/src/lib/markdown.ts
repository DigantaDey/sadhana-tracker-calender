// ── A deliberately small markdown renderer with Obsidian-style affordances ───
// Supports: headings, bold/italic, inline code, blockquote, lists, rules,
// [[wiki links]], #tags, and bare-url autolinks. Output is escaped first, so
// author-supplied HTML can never reach the DOM.

export type Parsed = {
  html: string;
  links: string[]; // wiki-link targets
  tags: string[];
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function extractLinks(body: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.push(m[1].trim());
  return [...new Set(out)];
}

export function extractTags(body: string): string[] {
  const out: string[] = [];
  // a tag starts a word with # and is not a markdown heading
  const re = /(^|\s)#([a-zA-Z][\w-]{1,30})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.push(m[2].toLowerCase());
  return [...new Set(out)];
}

function inline(text: string): string {
  let s = escapeHtml(text);

  // wiki links first, so their contents aren't touched by other rules
  s = s.replace(/\[\[([^\]]+)\]\]/g, (_m, raw: string) => {
    const target = raw.trim();
    const [label, alias] = target.split('|');
    return `<a class="wikilink" data-note="${escapeHtml(
      (alias || label).trim()
    )}" href="#">${escapeHtml((alias || label).trim())}</a>`;
  });

  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
  s = s.replace(/(^|\s)#([a-zA-Z][\w-]{1,30})/g, '$1<a iso="tag" class="tag" data-tag="$2" href="#">#$2</a>');
  s = s.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a class="external" href="$1" target="_blank" rel="noreferrer noopener">$1</a>'
  );
  return s;
}

export function renderMarkdown(body: string): Parsed {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      closeList();
      continue;
    }
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flushPara();
      closeList();
      out.push('<hr/>');
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length + 1;
      out.push(`<h${level} id="${slug(h[2])}">${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      flushPara();
      closeList();
      out.push(`<blockquote>${inline(trimmed.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ul || ol) {
      flushPara();
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((ul || ol)![1])}</li>`);
      continue;
    }
    // checkbox syntax
    const cb = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(trimmed);
    if (cb) {
      flushPara();
      closeList();
      out.push(
        `<p class="md-task ${cb[1] !== ' ' ? 'is-done' : ''}"><span class="md-box">${
          cb[1] !== ' ' ? '✓' : ''
        }</span>${inline(cb[2])}</p>`
      );
      continue;
    }
    para.push(trimmed);
  }
  flushPara();
  closeList();

  return {
    html: out.join('\n'),
    links: extractLinks(body),
    tags: extractTags(body),
  };
}

export function plainText(body: string): string {
  return body
    .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(body: string, len = 120): string {
  const t = plainText(body);
  return t.length > len ? `${t.slice(0, len).trimEnd()}…` : t;
}
