/**
 * Bulk-import poems from local TXT files into your Next app.
 * Usage:
 *   npm run import:poems -- "C:\\Users\\hootinid\\Desktop\\poesie\\annalivebardon\\en\\poesie"
 * Optional:
 *   npm run import:poems -- "C:\\path\\to\\poesie" --dry
 */

import fs from "node:fs";
import path from "node:path";

const APP_BASE = process.env.APP_BASE || "http://localhost:3000";
const BASIC_USER = process.env.BASIC_AUTH_USER || "admin";
const BASIC_PASS = process.env.BASIC_AUTH_PASS || "admin";
const AUTH = "Basic " + Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64");

type ImportBody = {
  slug: string;
  title: string;
  html: string;
  sourceUrl?: string;
  year?: number;
  category?: string;
};

function kebab(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Minimal HTML entity decoder (common named + numeric)
function decodeHtmlEntities(input: string) {
  if (!input) return input;
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    eacute: "é",
    Eacute: "É",
    egrave: "è",
    Egrave: "È",
    ecirc: "ê",
    Ecirc: "Ê",
    aacute: "á",
    Aacute: "Á",
    agrave: "à",
    Agrave: "À",
    acirc: "â",
    Acirc: "Â",
    ccedil: "ç",
    Ccedil: "Ç",
    icirc: "î",
    Icirc: "Î",
    ocirc: "ô",
    Ocirc: "Ô",
    ucirc: "û",
    Ucirc: "Û",
    uuml: "ü",
    Uuml: "Ü",
    ouml: "ö",
    Ouml: "Ö",
    auml: "ä",
    Auml: "Ä",
  };
  // Named entities
  let s = input.replace(/&([a-zA-Z]+);/g, (_, name: string) => named[name] ?? _);
  // Numeric decimal
  s = s.replace(/&#(\d+);/g, (_, num: string) => {
    const code = parseInt(num, 10);
    return Number.isFinite(code) ? String.fromCharCode(code) : _;
  });
  // Numeric hex
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
    const code = parseInt(hex, 16);
    return Number.isFinite(code) ? String.fromCharCode(code) : _;
  });
  return s;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Convert a .txt poem: first non-empty line = title; rest = poem.
 * - Decodes HTML entities
 * - Strips all HTML tags (but remembers if a line had class="byline")
 * - Preserves stanza breaks (blank lines -> <p></p>)
 */
function convertTxtToHTML(txt: string) {
  // Pre-decode entities first, then normalize whitespace
  const rawLines = txt.split(/\r?\n/).map((l) =>
    decodeHtmlEntities(
      l
        .replace(/\t+/g, " ")      // tabs -> space
        .replace(/[ \u00A0]+$/g, "") // trim right (including nbsp)
    )
  );

  // find title: first non-empty line (after decoding)
  let titleIdx = rawLines.findIndex((l) => l.trim().length > 0);
  if (titleIdx === -1) return { title: "Untitled", html: "" };

  // Title with collapsed internal whitespace
  const title = rawLines[titleIdx].replace(/\s+/g, " ").trim();

  // Body lines start after title
  const bodyLines = rawLines.slice(titleIdx + 1);

  // Trim leading/trailing empties in body (post-strip check will also handle)
  let start = 0;
  while (start < bodyLines.length && bodyLines[start].trim().length === 0) start++;
  let end = bodyLines.length - 1;
  while (end >= 0 && bodyLines[end].trim().length === 0) end--;
  const core = start <= end ? bodyLines.slice(start, end + 1) : [];

  // Build paragraphs line-by-line:
  // - Detect if line included 'class="byline"' BEFORE stripping tags
  // - Strip tags but keep the inner text
  // - Collapse internal whitespace
  const paragraphs = core
    .map((orig) => {
      const hadByline = /class\s*=\s*["']?byline["']?/i.test(orig);
      // Strip tags entirely
      const noTags = orig.replace(/<[^>]*>/g, "");
      const line = noTags.replace(/\s+/g, " ").trim();

      if (!line.length) return "<p></p>";
      const safe = escapeHtml(line);
      return hadByline ? `<p class="byline">${safe}</p>` : `<p>${safe}</p>`;
    })
    .join("");

  return { title, html: paragraphs };
}

function deriveCategory(absPath: string, root: string) {
  const rel = path.relative(root, absPath).split(path.sep);
  // top-level folder under root (e.g., "jours", "nuits", "autre")
  return rel.length > 1 ? rel[0] : undefined;
}

async function importOne(body: ImportBody, dryRun = false) {
  if (dryRun) {
    console.log(`[DRY] ${body.slug} — ${body.title} (${body.category || "uncat"})`);
    return;
  }
  const res = await fetch(`${APP_BASE}/api/admin/import`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: AUTH },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${body.slug}: ${res.status} ${res.statusText} ${text}`);
  }
  console.log(`Imported: ${body.slug} — ${body.title}`);
}

function listTxtFilesRecursive(dir: string) {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTxtFilesRecursive(p));
    else if (path.extname(entry.name).toLowerCase() === ".txt") out.push(p);
  }
  return out;
}

async function main() {
  const root = process.argv[2];
  const dry = process.argv.includes("--dry");
  if (!root) {
    console.error('Usage: tsx scripts/import-local-poems.ts "C:\\path\\to\\poesie" [--dry]');
    process.exit(1);
  }

  const files = listTxtFilesRecursive(root);
  if (!files.length) {
    console.error("No .txt files found under:", root);
    process.exit(1);
  }

  let imported = 0, failed = 0;

  for (const file of files) {
    try {
      const base = path.basename(file, ".txt");
      if (/^index$/i.test(base)) continue; // skip any index.txt if present

      const category = deriveCategory(file, root);
      const raw = fs.readFileSync(file, "utf8");

      const { title, html } = convertTxtToHTML(raw);

      // Slug from filename (keeps numeric prefixes like "011")
      const slug = kebab(base);

      const body: ImportBody = {
        slug,
        title,
        html,
        category,
      };

      await importOne(body, dry);
      imported++;
    } catch (e: any) {
      failed++;
      console.error("Failed:", file, "\n  ", e?.message || e);
    }
  }

  console.log(`Done. Imported: ${imported}, Failed: ${failed}${dry ? " (dry run)" : ""}.`);
}

main();
