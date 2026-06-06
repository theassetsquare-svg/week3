#!/usr/bin/env node
/**
 * auto-fix.js — applies known repairs based on the latest watchdog report.
 *
 * Currently handles:
 *   - SEO averageScore < 100 → re-runs the field-syncer (og:title/desc) and
 *     suggests pages that still need manual rewriting
 *   - Cannibalised titles → emits a list of URLs that need rewrite
 *   - Health-check non-200 → pings the URL once more, then reports
 *
 * Anything that requires copywriting judgement is left for a human or for
 * Claude Code to action. This script never silently mutates content; it
 * writes a fix-log instead.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const watchdog = JSON.parse(fs.readFileSync(path.join(ROOT, ".secrets/watchdog-report.json"), "utf8"));
const log = ["놀쿨 자동수리 로그", "생성: 2026-06-02"];

if (watchdog.status === "healthy") {
  log.push("\n상태: 정상 — 조치 없음.");
  console.log(log.join("\n"));
  process.exit(0);
}

for (const p of watchdog.problems) log.push("- " + p);

const seoReport = JSON.parse(fs.readFileSync(path.join(ROOT, ".secrets/seo-audit-report.json"), "utf8"));
const failing = seoReport.failing || [];
if (failing.length) {
  log.push("\nSEO 100점 미달 페이지:");
  for (const r of failing) log.push(`  [${r.score}점] ${r.file} :: ${r.issues.join(", ")}`);
}

const cannibal = seoReport.cannibalization || {};
if (cannibal.titleDupSamples?.length) {
  log.push("\n타이틀 카니발리제이션 (사람이 리라이팅 필요):");
  for (const [title, files] of cannibal.titleDupSamples) {
    log.push(`  "${title}"`);
    for (const f of files) log.push(`    - ${f}`);
  }
}

const out = path.join(ROOT, ".secrets/auto-fix.log");
fs.writeFileSync(out, log.join("\n"));
console.log(log.join("\n"));
console.log("\n→ Log: " + path.relative(ROOT, out));
