/**
 * Bulk-import Anna Livebardon poems from a local folder into your Next app.
 * Usage:
 *   npm run import:poems -- "C:\\Users\\hootinid\\Desktop\\poesie\\annalivebardon\\en\\poesie"
 */

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

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

const KNOWN_NAV_STRINGS = [
  "Précédent", "Suivant", "Previous", "Next",
  "Anna Livebardon", "Poésie", "The Anna Livebardon Homepage is maintained",
];

function kebab(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function trimLines(lines: string[]) {
  // Remove leading/trailing empties & nav-only lines
  const cleaned = lines
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(l => l.length > 0 && !KNOWN_NAV_STRINGS.some(k => l.includes(k)));
  // Collapse duplicate consecutive empties (already trimmed)
  return cleaned;
}

/** Extract poem from a site HTML file (your sample structure) */
function extractPoemFromHTML(html: string) {
  const dom = new JSDOM(html);
  const d = dom.window.document;

  // Title: prefer <h1>, fallback to <title>, fallback to first <b> inside a poem <p>
  let title =
    d.querySelector("h1")?.textContent?.trim() ||
    d.querySelector("title")?.textContent?.trim() ||
    d.querySelector("p > b")?.textContent?.trim() ||
    "Untitled";

  // Heuristic: find the poem <p> that contains many <br> (the lines)
  const candidates = Array.from(d.querySelectorAll("p")).filter(p =>
    p.innerHTML.toLowerCase().includes("<br")
  );

  let lines: string[] = [];
  if (candidates.length) {
    // Use the longest <p> by innerHTML length (usually the poem block)
    const poemP = candidates.sort((a, b) => b.innerHTML.length - a.innerHTML.length)[0];
    // Split on <br> and clean
    lines = poemP.innerHTML
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "") // strip any residual tags
      .split("\n");
  } else {
    // Fallback: use textContent of body, but this includes nav/footer. We'll trim with rules.
    const bodyText = d.body?.textContent || "";
    lines = bodyText.split(/\r?\n/);
  }

  // Remove title echoes and nav lines, trim spacing
  const titlePlain = title.replace(/\s+/g, " ").trim();
  let cleaned = lines.filter(l => l.replace(/\s+/g, " ").trim() !== titlePlain);
  cleaned = trimLines(cleaned);

  // Build minimal clean HTML: each line as <p> (keep stanza breaks by observing empty lines if any)
  const paragraphs = cleaned.map(l => `<p>${escapeHtml(l)}</p>`).join("");

  return { title, html: paragraphs };
}

/** Convert a .txt poem into simple <p>…</p> lines (collapse tabs/spaces) */
function convertTxtToHTML(txt: string) {
  const lines = txt
    .split(/\r?\n/)
  // Keep blank lines (stanza breaks) as empty paragraph markers
    .map(l => l.replace(/\t+/g, " ").replace(/ {2,}/g, " ").trimEnd());

  // Trim leading/trailing empties but preserve internal blanks
  let start = 0;
  while (start < lines.length && lines[start].trim().length === 0) start++;
  let end = lines.length - 1;
  while (end >= 0 && lines[end].trim().length === 0) end--;
  const core = lines.slice(start, end + 1);

  const paragraphs = core
    .map(l => (l.trim().length ? `<p>${escapeHtml(l.trim())}</p>` : "<p></p>"))
    .join("");
  // Title: first non-empty line (uppercase often used in source)
  const title =
    core.find(l => l.trim().length > 0)?.replace(/\s+/g, " ").trim() || "Untitled";
  return { title, html: paragraphs };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function listFilesRecursive(dir: string, exts = [".html", ".txt"]) {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(p, exts));
    else if (exts.includes(path.extname(entry.name).toLowerCase())) out.push(p);
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
  const files = listFilesRecursive(root, [".html", ".txt"]);
  if (!files.length) {
    console.error("No .html or .txt files found under:", root);
    process.exit(1);
  }

  for (const file of files) {
    try {
      const ext = path.extname(file).toLowerCase();
      const base = path.basename(file, ext);
      const category = deriveCategory(file, root);
      // skip index.html, images, etc.
      if (/^index$/i.test(base)) continue;

      let title = "";
      let html = "";

      const raw = fs.readFileSync(file, "utf8");

      if (ext === ".html") {
        const extracted = extractPoemFromHTML(raw);
        title = extracted.title;
        html = extracted.html;
      } else {
        const converted = convertTxtToHTML(raw);
        title = converted.title;
        html = converted.html;
      }

      // Slug from filename; if base starts with numeric (e.g., 011), keep it
      const slug = kebab(base);

      const body: ImportBody = {
        slug,
        title,
        html,
        category,
        // Optionally set a sourceUrl that points back to your source tree or website:
        // sourceUrl: undefined,
        // year: undefined,
      };

      await importOne(body, dry);
    } catch (e: any) {
      console.error("Failed:", file, "\n  ", e?.message || e);
    }
  }
}

main();
