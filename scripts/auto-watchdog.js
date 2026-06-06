#!/usr/bin/env node
/**
 * auto-watchdog.js — single-entry automation that ties together:
 *   1. SEO audit (local files)
 *   2. Live site health check
 *   3. GSC monitor (search analytics)
 *   4. Queues a Gmail alert if anything is wrong
 *
 * Run with cron, GitHub Actions, or a long-running supervisor:
 *   every 15 minutes: cd /home/user/week3 && node scripts/auto-watchdog.js
 *
 * Exit codes: 0 healthy, 1 issues queued.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const STAGES = [
  { name: "seo-audit", cmd: "node scripts/seo-full-audit.js" },
  { name: "health-check", cmd: "node scripts/health-check.js" },
  { name: "gsc-monitor", cmd: "node scripts/gsc-monitor.js" },
];

function run(cmd) {
  try { return { ok: true, out: execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: "pipe" }) }; }
  catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || ""), code: e.status }; }
}

function tail(s, n) { return s.split("\n").slice(-n).join("\n"); }

const summary = [];
const failures = [];
for (const s of STAGES) {
  console.log("\n>>>", s.name);
  const r = run(s.cmd);
  console.log(tail(r.out, 20));
  summary.push({ stage: s.name, ok: r.ok, exitCode: r.code || 0 });
  if (!r.ok) failures.push({ stage: s.name, output: tail(r.out, 40) });
}

// Inspect reports for actionable issues
const seo = JSON.parse(fs.readFileSync(path.join(ROOT, ".secrets/seo-audit-report.json"), "utf8"));
let health = { issues: [], summary: {} };
try { health = JSON.parse(fs.readFileSync(path.join(ROOT, ".secrets/health-report.json"), "utf8")); } catch {}
let gsc = null;
try { gsc = JSON.parse(fs.readFileSync(path.join(ROOT, ".secrets/gsc-report.json"), "utf8")); } catch {}

const problems = [];
if (seo.averageScore < 95) problems.push(`SEO 평균 점수 ${seo.averageScore}/100 (95 미만)`);
if (seo.cannibalization.duplicateTitles) problems.push(`타이틀 중복 ${seo.cannibalization.duplicateTitles}건`);
if (seo.cannibalization.duplicateDescs) problems.push(`디스크립션 중복 ${seo.cannibalization.duplicateDescs}건`);
const hs = health.summary || {};
if (hs.non200) problems.push(`라이브 사이트 ${hs.non200}개 페이지 비정상 응답`);
if (hs.slow) problems.push(`느린 페이지 ${hs.slow}건 (>3s)`);
if (hs.noTitle) problems.push(`타이틀 누락 ${hs.noTitle}건`);
if (hs.duplicateTitle) problems.push(`라이브 타이틀 중복 ${hs.duplicateTitle}건`);
if (gsc && gsc.status === "service-account-not-authorised") {
  problems.push(`GSC 권한 미부여 — ${gsc.serviceAccount} 를 Search Console 사용자로 추가 필요`);
}
if (failures.length) for (const f of failures) problems.push(`${f.stage} 스크립트 실패`);

const result = {
  generatedAt: "2026-06-02",
  status: problems.length ? "issues" : "healthy",
  problems,
  summary,
  seo: { score: seo.averageScore, cannibal: seo.cannibalization },
  health: hs,
  gsc: gsc ? { clicks: gsc.totals?.clicks, impressions: gsc.totals?.impressions, striking: gsc.strikingDistance?.length, lowCtr: gsc.lowCtrHighImpressions?.length } : null,
};
fs.writeFileSync(path.join(ROOT, ".secrets/watchdog-report.json"), JSON.stringify(result, null, 2));

if (problems.length) {
  const body = "놀쿨 자동 워치독 알람\n\n" +
    "문제 목록:\n" + problems.map((p, i) => `  ${i + 1}. ${p}`).join("\n") +
    "\n\n전체 리포트: .secrets/watchdog-report.json\n" +
    "조치: scripts/auto-fix.js 실행 또는 Claude Code 세션에서 처리.";
  const subject = `${problems.length}건 이슈 발생`;
  run(`node scripts/gmail-alert.js --subject ${JSON.stringify(subject)} --body ${JSON.stringify(body)} --severity warn --tag watchdog`);
  console.log("\n[WATCHDOG] 문제", problems.length, "건 발견. Gmail 알람 큐잉됨.");
  process.exit(1);
}
console.log("\n[WATCHDOG] 모든 시스템 정상.");
