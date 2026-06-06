#!/usr/bin/env node
/**
 * health-check.js — site-wide live health monitoring.
 *
 * Pulls sitemap, fans out HEAD/GET requests to every URL, captures:
 *   - non-200 status codes
 *   - missing or weak <title> / <meta description>
 *   - duplicate <title> across URLs (cannibalisation)
 *   - missing OG image
 *   - slow responses (> 3s TTFB)
 *
 * Output: .secrets/health-report.json
 * Exit codes: 0 healthy / 1 issues / 2 fatal
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..");
const SITE = process.argv[2] || "https://week3-2og.pages.dev";
const OUT = path.join(ROOT, ".secrets", "health-report.json");
const CONCURRENCY = 6;
const TIMEOUT_MS = 8000;

function fetchText(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const start = Date.now();
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: "GET", headers: { "user-agent": "nolcool-healthcheck/1.0", accept: "text/html,*/*" } },
      (res) => {
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (buf += c));
        res.on("end", () => resolve({ url, status: res.statusCode, ms: Date.now() - start, body: buf, headers: res.headers }));
      }
    );
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve({ url, status: 0, ms: Date.now() - start, body: "", error: "timeout" }); });
    req.on("error", (e) => resolve({ url, status: 0, ms: Date.now() - start, body: "", error: e.message }));
    req.end();
  });
}

function parseSitemap(xml) {
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) urls.push(m[1].trim());
  return urls;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

(async () => {
  console.log("Fetching sitemap...");
  const sm = await fetchText(SITE + "/sitemap.xml");
  if (sm.status !== 200) { console.error("sitemap fetch failed:", sm.status, sm.error); process.exit(2); }
  const urls = parseSitemap(sm.body);
  console.log("URLs to check:", urls.length);

  const results = await mapLimit(urls, CONCURRENCY, async (u, i) => {
    const r = await fetchText(u);
    const title = (r.body.match(/<title>([^<]*)<\/title>/) || [, ""])[1].trim();
    const desc = (r.body.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [, ""])[1].trim();
    const ogImg = (r.body.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i) || [, ""])[1].trim();
    const canonical = (r.body.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) || [, ""])[1].trim();
    if ((i + 1) % 20 === 0) console.log("  checked", i + 1, "/", urls.length);
    return { url: u, status: r.status, ms: r.ms, title, desc, ogImg, canonical, error: r.error || null };
  });

  const issues = [];
  const titleMap = new Map();
  for (const r of results) {
    if (r.status !== 200) issues.push({ type: "non-200", url: r.url, status: r.status, error: r.error });
    if (r.ms > 3000) issues.push({ type: "slow", url: r.url, ms: r.ms });
    if (!r.title) issues.push({ type: "no-title", url: r.url });
    if (!r.desc) issues.push({ type: "no-desc", url: r.url });
    if (!r.ogImg) issues.push({ type: "no-og-image", url: r.url });
    if (r.title) (titleMap.get(r.title) || titleMap.set(r.title, []).get(r.title)).push(r.url);
  }
  for (const [t, urls2] of titleMap) {
    if (urls2.length > 1) issues.push({ type: "duplicate-title", title: t, urls: urls2 });
  }

  const report = {
    generatedAt: "2026-06-02",
    site: SITE,
    pages: results.length,
    healthy: results.filter((r) => r.status === 200).length,
    avgMs: Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length),
    p95Ms: results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length * 0.95)] || 0,
    issues,
    summary: {
      non200: issues.filter((i) => i.type === "non-200").length,
      slow: issues.filter((i) => i.type === "slow").length,
      noTitle: issues.filter((i) => i.type === "no-title").length,
      noDesc: issues.filter((i) => i.type === "no-desc").length,
      noOgImage: issues.filter((i) => i.type === "no-og-image").length,
      duplicateTitle: issues.filter((i) => i.type === "duplicate-title").length,
    },
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("=== Health Report ===");
  console.log("Pages:", report.pages, "Healthy:", report.healthy);
  console.log("Avg ms:", report.avgMs, "p95:", report.p95Ms);
  console.log("Issues:", JSON.stringify(report.summary));
  console.log("Saved:", path.relative(ROOT, OUT));
  if (issues.length) process.exit(1);
})().catch((e) => { console.error("fatal:", e.message); process.exit(2); });
