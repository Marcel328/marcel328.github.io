import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type PostSummary = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  readingTime: number;
};

export type Post = PostSummary & {
  html: string;
  previous?: Pick<PostSummary, "slug" | "title">;
  next?: Pick<PostSummary, "slug" | "title">;
};

const postsDirectory = path.join(process.cwd(), "content", "posts");

export async function getPosts(): Promise<Post[]> {
  const entries = await readdir(postsDirectory, { withFileTypes: true });
  const posts = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_"))
      .map(async (entry) => parsePost(entry.name, await readFile(path.join(postsDirectory, entry.name), "utf8"))),
  );

  return posts.sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title));
}

export async function getPost(slug: string): Promise<Post | undefined> {
  const posts = await getPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return undefined;

  const post = posts[index];
  return {
    ...post,
    previous: posts[index + 1] && pickRelated(posts[index + 1]),
    next: posts[index - 1] && pickRelated(posts[index - 1]),
  };
}

function pickRelated(post: Post): Pick<PostSummary, "slug" | "title"> {
  return { slug: post.slug, title: post.title };
}

function parsePost(filename: string, raw: string): Post {
  const { metadata, body } = splitFrontMatter(raw);
  const { title: leadingTitle, body: articleBody } = takeLeadingTitle(body);
  const title = metadata.title || leadingTitle || filename.replace(/\.md$/, "");
  const plain = plainText(articleBody);

  return {
    slug: filename.replace(/\.md$/, ""),
    title,
    date: metadata.date ?? "",
    excerpt: metadata.excerpt ? shorten(metadata.excerpt, 115) : openingExcerpt(articleBody),
    tags: splitTags(metadata.tags),
    readingTime: Math.max(1, Math.ceil(Math.max(plain.split(/\s+/).filter(Boolean).length, 1) / 250)),
    html: renderMarkdown(articleBody),
  };
}

function splitFrontMatter(raw: string) {
  if (!raw.startsWith("---\n")) return { metadata: {} as Record<string, string>, body: raw };
  const end = raw.indexOf("\n---\n", 4);
  if (end < 0) return { metadata: {} as Record<string, string>, body: raw };

  const metadata = Object.fromEntries(
    raw.slice(4, end).split("\n").flatMap((line) => {
      const separator = line.indexOf(":");
      if (separator < 0) return [];
      return [[line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, "")]];
    }),
  );
  return { metadata, body: raw.slice(end + 5) };
}

function takeLeadingTitle(body: string) {
  const trimmed = body.replace(/^\s+/, "");
  if (!trimmed.startsWith("# ")) return { title: "", body };
  const newline = trimmed.indexOf("\n");
  return newline < 0
    ? { title: trimmed.slice(2).trim(), body: "" }
    : { title: trimmed.slice(2, newline).trim(), body: trimmed.slice(newline + 1) };
}

function splitTags(value?: string) {
  return (value ?? "").replace(/^\[|\]$/g, "").split(",").map((tag) => tag.trim().replace(/^['\"]|['\"]$/g, "")).filter(Boolean);
}

function plainText(markdown: string) {
  return markdown
    .split("\n")
    .filter((line) => line.trim() && !line.trimStart().startsWith("```"))
    .map((line) => line.trim().replace(/^[#>\-*\d.\s]+/, "").replace(/[\*`\[\]]/g, ""))
    .join(" ");
}

function shorten(value: string, length: number) {
  const trimmed = value.trim().replace(/[…。.]$/, "");
  return `${trimmed.length <= length ? trimmed : trimmed.slice(0, length).trim()}…`;
}

function openingExcerpt(markdown: string) {
  const lines: string[] = [];
  let inCode = false;
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("```")) { inCode = !inCode; continue; }
    if (inCode || !line || /^#{1,3}\s/.test(line)) {
      if (lines.length && !line) break;
      continue;
    }
    lines.push(line);
  }
  return shorten(plainText(lines.join("\n")), 115);
}

function renderMarkdown(markdown: string) {
  const output: string[] = [];
  const paragraph: string[] = [];
  const quote: string[] = [];
  let list: "ul" | "ol" | "" = "";
  let inCode = false;
  let language = "text";
  const code: string[] = [];
  let firstParagraph = true;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p${firstParagraph ? ' class="lead"' : ""}>${renderInline(paragraph.join(" "))}</p>`);
    firstParagraph = false;
    paragraph.length = 0;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    output.push(`<blockquote><p>${renderInline(quote.join(" "))}</p></blockquote>`);
    quote.length = 0;
  };
  const closeList = () => {
    if (list) output.push(`</${list}>`);
    list = "";
  };
  const flushCode = () => {
    output.push(`<pre><code class="language-${escapeHtml(language)}">${highlightCode(language, code.join("\n"))}</code></pre>`);
    code.length = 0;
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      flushParagraph(); flushQuote(); closeList();
      if (inCode) { flushCode(); inCode = false; } else { inCode = true; language = trimmed.slice(3).trim() || "text"; }
      continue;
    }
    if (inCode) { code.push(rawLine); continue; }
    if (!trimmed) { flushParagraph(); flushQuote(); closeList(); continue; }
    if (trimmed.startsWith("> ")) { flushParagraph(); closeList(); quote.push(trimmed.slice(2).trim()); continue; }
    flushQuote();
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { flushParagraph(); closeList(); output.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`); continue; }
    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const kind = unordered ? "ul" : "ol";
      if (list !== kind) { closeList(); output.push(`<${kind}>`); list = kind; }
      output.push(`<li>${renderInline((unordered ?? ordered)![1])}</li>`);
      continue;
    }
    closeList();
    paragraph.push(trimmed);
  }
  flushParagraph(); flushQuote(); closeList();
  if (inCode) flushCode();
  return output.join("\n");
}

function renderInline(value: string) {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_, alt, source) => `<img src="${safeUrl(source)}" alt="${alt}">`);
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, text, href) => `<a href="${safeUrl(href)}">${text}</a>`);
  return html.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function safeUrl(value: string) {
  return /^(https?:|mailto:|\/|#)/.test(value) ? value : "#";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!);
}

const keywords = new Set(["break", "case", "catch", "class", "const", "continue", "default", "defer", "else", "export", "for", "from", "func", "function", "go", "if", "import", "interface", "let", "new", "package", "private", "public", "return", "struct", "switch", "type", "var", "while", "select", "create", "table", "insert", "into", "values", "update", "set", "delete", "where", "and", "or", "as", "primary", "key", "not", "null", "index", "on", "using", "from", "join", "order", "by", "group", "having", "limit", "json", "jsonb"]);

function highlightCode(language: string, source: string) {
  if (!/^(go|js|javascript|ts|typescript|tsx|json|py|python|sh|bash|sql|postgres|postgresql)$/i.test(language)) return escapeHtml(source);
  const output: string[] = [];
  const isHashComment = /^(py|python|sh|bash)$/i.test(language);
  const isSQL = /^(sql|postgres|postgresql)$/i.test(language);

  for (let index = 0; index < source.length;) {
    if (source.startsWith("//", index) || (isHashComment && source[index] === "#") || (isSQL && source.startsWith("--", index))) {
      const end = source.indexOf("\n", index);
      output.push(token("c", source.slice(index, end < 0 ? source.length : end)));
      index = end < 0 ? source.length : end;
      continue;
    }
    if (["'", '"', "`"].includes(source[index])) {
      const quote = source[index];
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === "\\") { end += 2; continue; }
        end += 1;
        if (source[end - 1] === quote) break;
      }
      output.push(token("s", source.slice(index, end)));
      index = end;
      continue;
    }
    if (/\d/.test(source[index])) {
      let end = index + 1;
      while (end < source.length && /[\d.]/.test(source[end])) end += 1;
      output.push(token("m", source.slice(index, end)));
      index = end;
      continue;
    }
    if (isWord(source[index])) {
      let end = index + 1;
      while (end < source.length && isWord(source[end])) end += 1;
      const word = source.slice(index, end);
      output.push(keywords.has(word.toLowerCase()) || ["true", "false", "null", "nil", "undefined"].includes(word.toLowerCase()) ? token("k", word) : escapeHtml(word));
      index = end;
      continue;
    }
    output.push(escapeHtml(source[index]));
    index += 1;
  }
  return output.join("");
}

function isWord(value: string) {
  return /[A-Za-z0-9_]/.test(value);
}

function token(className: string, value: string) {
  return `<span class="tok-${className}">${escapeHtml(value)}</span>`;
}
