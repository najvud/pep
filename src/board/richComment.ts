const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 's', 'strike', 'u', 'br', 'div', 'p', 'ul', 'ol', 'li', 'span']);

const RICH_COLOR_CLASSES = new Set([
  'rc-color-0',
  'rc-color-1',
  'rc-color-2',
  'rc-color-3',
  'rc-color-4',
  'rc-color-5',
  'rc-bg-0',
  'rc-bg-1',
  'rc-bg-2',
  'rc-bg-3',
  'rc-bg-4',
  'rc-bg-5',
  'rc-bg-6',
]);

function normalizeColor(value: string | null | undefined): string | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('"', '')
    .replaceAll("'", '');
  if (!raw) return null;

  const shortHex = /^#([0-9a-f]{3})$/.exec(raw);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  const fullHex = /^#([0-9a-f]{6})$/.exec(raw);
  if (fullHex) return `#${fullHex[1]}`;

  const rgb = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*[\d.]+\s*)?\)$/.exec(raw);
  if (!rgb) return null;

  const toHex = (part: string) => {
    const num = Math.max(0, Math.min(255, Number(part)));
    return num.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
}

function sanitizeSpanStyle(rawStyle: string | null | undefined): string | null {
  const source = String(rawStyle ?? '').trim();
  if (!source) return null;

  let color: string | null = null;
  let bgColor: string | null = null;
  for (const chunk of source.split(';')) {
    const [propRaw, valueRaw] = chunk.split(':');
    if (!propRaw || !valueRaw) continue;
    const prop = propRaw.trim().toLowerCase();
    const normalized = normalizeColor(valueRaw.trim());
    if (!normalized) continue;
    if (prop === 'color') color = normalized;
    if (prop === 'background' || prop === 'background-color') bgColor = normalized;
  }

  const styles: string[] = [];
  if (color) styles.push(`color:${color}`);
  if (bgColor) styles.push(`background-color:${bgColor}`);
  return styles.length > 0 ? styles.join(';') : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const fragment = doc.createDocumentFragment();

  if (tag === 'font') {
    const out = doc.createElement('span');
    const normalizedColor = normalizeColor(el.getAttribute('color'));
    if (normalizedColor) out.setAttribute('style', `color:${normalizedColor}`);
    for (const child of Array.from(el.childNodes)) {
      const sanitizedChild = sanitizeNode(child, doc);
      if (sanitizedChild) out.appendChild(sanitizedChild);
    }
    if (!out.getAttribute('style') && out.childNodes.length === 1) {
      return out.firstChild ? out.firstChild.cloneNode(true) : null;
    }
    return out;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    for (const child of Array.from(el.childNodes)) {
      const sanitizedChild = sanitizeNode(child, doc);
      if (sanitizedChild) fragment.appendChild(sanitizedChild);
    }
    return fragment;
  }

  const out = doc.createElement(tag);
  if (tag === 'span') {
    const className = String(el.getAttribute('class') ?? '')
      .split(/\s+/)
      .map((item) => item.trim())
      .filter((item) => item && RICH_COLOR_CLASSES.has(item));
    if (className.length > 0) out.setAttribute('class', className.join(' '));

    const style = sanitizeSpanStyle(el.getAttribute('style'));
    if (style) out.setAttribute('style', style);
  }

  for (const child of Array.from(el.childNodes)) {
    const sanitizedChild = sanitizeNode(child, doc);
    if (sanitizedChild) out.appendChild(sanitizedChild);
  }

  if (tag === 'span' && !out.getAttribute('class') && !out.getAttribute('style') && out.childNodes.length === 1) {
    return out.firstChild ? out.firstChild.cloneNode(true) : null;
  }

  return out;
}

function normalizeLineBreaks(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

function safeEditorHtml(input: string): string {
  const source = normalizeLineBreaks(input);
  if (!source.trim()) return '';

  const prepared = looksLikeHtml(source) ? source : escapeHtml(source).replace(/\n/g, '<br>');
  const doc = document.implementation.createHTMLDocument('rich-comment');
  const root = doc.createElement('div');
  root.innerHTML = prepared;

  const sanitizedRoot = doc.createElement('div');
  for (const node of Array.from(root.childNodes)) {
    const sanitized = sanitizeNode(node, doc);
    if (sanitized) sanitizedRoot.appendChild(sanitized);
  }

  return sanitizedRoot.innerHTML.trim();
}

function collapseSpace(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}

export function normalizeRichCommentHtml(input: string): string {
  return safeEditorHtml(input).slice(0, 4000);
}

export function richCommentToPlainText(input: string): string {
  const html = normalizeRichCommentHtml(input);
  if (!html) return '';
  const doc = document.implementation.createHTMLDocument('rich-comment-text');
  const root = doc.createElement('div');
  root.innerHTML = html;
  return collapseSpace(root.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasRichCommentContent(input: string): boolean {
  return richCommentToPlainText(input).length > 0;
}

export function renderRichCommentHtml(input: string): string {
  return normalizeRichCommentHtml(input);
}
