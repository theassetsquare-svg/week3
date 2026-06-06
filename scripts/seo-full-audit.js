#!/usr/bin/env node
/**
 * seo-full-audit.js — comprehensive SEO audit for all HTML pages.
 *
 * Checks per page:
 *   - <title> present, length 25-65, unique across site
 *   - <meta description> present, length 70-160, unique
 *   - <link rel="canonical"> present
 *   - <h1> present
 *   - og:title / og:description / og:image / og:url
 *   - twitter:card
 *   - JSON-LD present
 *   - lang attr on <html>
 *   - duplicate words in <title> (e.g. "강남 강남")
 *   - keyword cannibalisation: same <title> across multiple URLs
 *
 * Writes JSON report to .secrets/seo-audit-report.json and prints summary.
 * Exit code 0 = all pages 90+ score. Non-zero only if --strict.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP = new Set(["node_modules", ".wrangler", ".git", ".secrets", "gsc-cache"]);

function walk(dir, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function pick(re, html) {
  const m = html.match(re);
  return m ? m[1].trim() : "";
}
function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function checkDupWords(title) {
  // Split by Korean/English word boundaries, look for any token appearing >= 2 times
  const tokens = (title.match(/[가-힣]{2,}|[A-Za-z]{2,}/g) || []).map((s) => s);
  const seen = new Set();
  const dups = new Set();
  for (const t of tokens) {
    if (seen.has(t)) dups.add(t);
    seen.add(t);
  }
  return [...dups];
}

function auditFile(file) {
  const html = fs.readFileSync(file, "utf8");
  const title = decode(pick(/<title>([^<]*)<\/title>/, html));
  const desc = decode(pick(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i, html));
  const ogTitle = decode(pick(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i, html));
  const ogDesc = decode(pick(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i, html));
  const ogImage = pick(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i, html);
  const ogUrl = pick(/<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i, html);
  const twCard = pick(/<meta\s+name=["']twitter:card["']\s+content=["']([^"']*)["']/i, html);
  const canonical = pick(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i, html);
  const h1 = decode(pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)).replace(/<[^>]+>/g, "").trim();
  const langAttr = pick(/<html[^>]*\blang=["']([^"']*)["']/i, html);
  const hasJsonLd = /<script[^>]+application\/ld\+json[^>]*>/i.test(html);

  const issues = [];
  let score = 100;

  if (!title) { issues.push("missing-title"); score -= 25; }
  else {
    if (title.length < 20) { issues.push("title-too-short"); score -= 5; }
    if (title.length > 65) { issues.push("title-too-long"); score -= 5; }
    const dups = checkDupWords(title);
    if (dups.length) { issues.push("title-dup-word:" + dups.join(",")); score -= 15; }
  }

  if (!desc) { issues.push("missing-meta-desc"); score -= 15; }
  else {
    if (desc.length < 60) { issues.push("desc-too-short"); score -= 5; }
    if (desc.length > 170) { issues.push("desc-too-long"); score -= 5; }
  }

  if (!canonical) { issues.push("missing-canonical"); score -= 10; }
  if (!h1) { issues.push("missing-h1"); score -= 10; }
  if (!ogTitle) { issues.push("missing-og-title"); score -= 5; }
  if (!ogDesc) { issues.push("missing-og-desc"); score -= 5; }
  if (!ogImage) { issues.push("missing-og-image"); score -= 5; }
  if (!ogUrl) { issues.push("missing-og-url"); score -= 3; }
  if (!twCard) { issues.push("missing-twitter-card"); score -= 2; }
  if (!langAttr) { issues.push("missing-html-lang"); score -= 3; }
  if (!hasJsonLd) { issues.push("missing-json-ld"); score -= 5; }

  return { file: path.relative(ROOT, file), title, desc, canonical, h1, ogTitle, ogDesc, ogImage, score: Math.max(0, score), issues };
}

function detectCannibalization(results) {
  const byTitle = new Map();
  const byDesc = new Map();
  for (const r of results) {
    if (r.title) (byTitle.get(r.title) || byTitle.set(r.title, []).get(r.title)).push(r.file);
    if (r.desc) (byDesc.get(r.desc) || byDesc.set(r.desc, []).get(r.desc)).push(r.file);
  }
  const titleDup = [...byTitle.entries()].filter(([, files]) => files.length > 1);
  const descDup = [...byDesc.entries()].filter(([, files]) => files.length > 1);
  return { titleDup, descDup };
}

function main() {
  const files = walk(ROOT);
  const results = files.map(auditFile);
  const { titleDup, descDup } = detectCannibalization(results);

  // mark cannibalised pages
  const titleDupSet = new Set();
  titleDup.forEach(([, fs2]) => fs2.forEach((f) => titleDupSet.add(f)));
  const descDupSet = new Set();
  descDup.forEach(([, fs2]) => fs2.forEach((f) => descDupSet.add(f)));
  for (const r of results) {
    if (titleDupSet.has(r.file)) { r.issues.push("title-cannibalization"); r.score = Math.max(0, r.score - 20); }
    if (descDupSet.has(r.file)) { r.issues.push("desc-cannibalization"); r.score = Math.max(0, r.score - 15); }
  }

  const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  const failing = results.filter((r) => r.score < 90).sort((a, b) => a.score - b.score);
  const perfect = results.filter((r) => r.score === 100).length;

  const report = {
    generatedAt: "2026-06-02",
    totalPages: results.length,
    averageScore: avg,
    perfectPages: perfect,
    failingPages: failing.length,
    cannibalization: {
      duplicateTitles: titleDup.length,
      duplicateDescs: descDup.length,
      titleDupSamples: titleDup.slice(0, 10),
      descDupSamples: descDup.slice(0, 10),
    },
    failing,
    all: results,
  };

  const outDir = path.join(ROOT, ".secrets");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const outPath = path.join(outDir, "seo-audit-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("=== SEO Full Audit ===");
  console.log("Pages scanned:", results.length);
  console.log("Average score:", avg, "/ 100");
  console.log("Perfect (100):", perfect);
  console.log("Failing (<90):", failing.length);
  console.log("Cannibalised titles:", titleDup.length);
  console.log("Cannibalised descs:", descDup.length);
  if (failing.length) {
    console.log("\nTop failing pages:");
    for (const r of failing.slice(0, 15)) {
      console.log(`  ${r.score}  ${r.file}  ::  ${r.issues.join(", ")}`);
    }
  }
  console.log("\nReport: " + path.relative(ROOT, outPath));
  if (process.argv.includes("--strict") && (avg < 95 || titleDup.length || descDup.length)) {
    process.exit(1);
  }
}
main();
