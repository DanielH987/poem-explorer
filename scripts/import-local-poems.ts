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

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Convert a .txt poem: first non-empty line = title; rest = poem; preserve stanza breaks. */
function convertTxtToHTML(txt: string) {
  const rawLines = txt.split(/\r?\n/).map((l) =>
    // normalize spacing: tabs -> space, collapse runs, trim right
    l.replace(/\t+/g, " ").replace(/ {2,}/g, " ").replace(/[ \u00A0]+$/g, "")
  );

  // find title: first non-empty line
  let titleIdx = rawLines.findIndex((l) => l.trim().length > 0);
  if (titleIdx === -1) {
    return { title: "Untitled", html: "" };
  }

  // Title as-is, but normalized single spaces
  const title = rawLines[titleIdx].replace(/\s+/g, " ").trim();

  // Content starts after the title line
  const bodyLines = rawLines.slice(titleIdx + 1);

  // Trim leading/trailing empty lines in body
  let start = 0;
  while (start < bodyLines.length && bodyLines[start].trim().length === 0) start++;
  let end = bodyLines.length - 1;
  while (end >= 0 && bodyLines[end].trim().length === 0) end--;
  const core = start <= end ? bodyLines.slice(start, end + 1) : [];

  // Build paragraphs:
  // - non-empty -> <p>line</p>
  // - empty -> <p></p> (keeps stanza breaks)
  const paragraphs = core
    .map((l) => {
      const line = l.replace(/\s+/g, " ").trim(); // collapse internal runs
      return line.length ? `<p>${escapeHtml(line)}</p>` : "<p></p>";
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

      // slug from filename (keeps numeric prefixes like "011")
      const slug = kebab(base);

      const body: ImportBody = {
        slug,
        title,
        html,
        category,
        // sourceUrl/year optional
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
