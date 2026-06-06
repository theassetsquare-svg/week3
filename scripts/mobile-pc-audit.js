#!/usr/bin/env node
/**
 * mobile-pc-audit.js — checks both Googlebot-Mobile and Googlebot-Desktop
 * see identical HTML and that critical viewport / mobile-friendly hints
 * are present. Run after deploy.
 */
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const SITE = process.argv[2] || "https://week3-2og.pages.dev";
const ROOT = path.join(__dirname, "..");

const UAS = {
  desktop: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  mobile:
    "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

function fetchUA(url, ua) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, headers: { "user-agent": ua, accept: "text/html" } },
      (res) => {
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (buf += c));
        res.on("end", () => resolve({ status: res.statusCode, body: buf }));
      }
    );
    req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, body: "" }); });
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.end();
  });
}

function check(html) {
  return {
    viewport: /<meta[^>]+name=["']viewport["'][^>]+width=device-width/i.test(html),
    title: ((html.match(/<title>([^<]*)<\/title>/) || [, ""])[1] || "").trim(),
    desc: ((html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [, ""])[1] || "").trim(),
    canonical: ((html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) || [, ""])[1] || "").trim(),
    bytes: html.length,
  };
}

const SAMPLE_PATHS = [
  "/",
  "/c/%EB%82%98%EC%9D%B4%ED%8A%B8/",
  "/c/%ED%81%B4%EB%9F%BD/",
  "/v/gangnam-club-arte/",
  "/v/gangnam-club-utopia/",
  "/v/ilsan-room/",
  "/community/",
  "/community/calculator",
  "/interactive/quiz",
  "/map/",
];

(async () => {
  const out = [];
  for (const p of SAMPLE_PATHS) {
    const url = SITE + p;
    const [d, m] = await Promise.all([fetchUA(url, UAS.desktop), fetchUA(url, UAS.mobile)]);
    const dc = check(d.body), mc = check(m.body);
    const issue = [];
    if (d.status !== 200) issue.push("desktop-status:" + d.status);
    if (m.status !== 200) issue.push("mobile-status:" + m.status);
    if (!dc.viewport) issue.push("desktop-no-viewport");
    if (!mc.viewport) issue.push("mobile-no-viewport");
    if (dc.title !== mc.title) issue.push("title-mismatch");
    if (dc.desc !== mc.desc) issue.push("desc-mismatch");
    if (dc.canonical !== mc.canonical) issue.push("canonical-mismatch");
    if (Math.abs(dc.bytes - mc.bytes) > 1024) issue.push("body-size-diff:" + Math.abs(dc.bytes - mc.bytes));
    out.push({ url, desktop: { status: d.status, ...dc }, mobile: { status: m.status, ...mc }, issues: issue });
    console.log(issue.length ? "⚠️" : "✅", url, issue.join(",") || "ok");
  }
  fs.writeFileSync(path.join(ROOT, ".secrets/mobile-pc-audit.json"), JSON.stringify(out, null, 2));
  const total = out.length, issues = out.filter((o) => o.issues.length).length;
  console.log(`\n${total - issues}/${total} 페이지 모바일/PC 일치, 문제 ${issues}건`);
})();
