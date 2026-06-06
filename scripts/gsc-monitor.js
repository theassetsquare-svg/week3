#!/usr/bin/env node
/**
 * gsc-monitor.js — Google Search Console autopilot.
 *
 * Reads service-account key, signs a JWT, gets an access token,
 * pulls Search Analytics for the site, and writes a report:
 *   .secrets/gsc-report.json
 *   .secrets/gsc-keyword-opportunities.json
 *
 * Identifies:
 *   - Top queries we already rank for
 *   - "Striking distance" queries (rank 5-20) — biggest upside if we improve
 *   - Pages with high impressions but low CTR (weak title/desc)
 *   - Cannibalisation: 2+ URLs ranking for the same query
 *
 * No external deps — uses Node built-in crypto.
 *
 * Usage:
 *   node scripts/gsc-monitor.js               # last 28 days
 *   node scripts/gsc-monitor.js --days=90     # last 90 days
 *   node scripts/gsc-monitor.js --site=https://week3-2og.pages.dev/
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const KEY_PATH = path.join(ROOT, ".secrets", "theasset-gsc.json");
const OUT_DIR = path.join(ROOT, ".secrets");
const SITE = arg("--site", "https://week3-2og.pages.dev/");
const DAYS = parseInt(arg("--days", "28"), 10);

function arg(name, def) {
  const a = process.argv.find((s) => s.startsWith(name + "="));
  return a ? a.split("=").slice(1).join("=") : def;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function isoDaysAgo(n) {
  const d = new Date("2026-06-02T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function getAccessToken(key) {
  const iat = Math.floor(new Date("2026-06-02T00:00:00Z").getTime() / 1000);
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp: iat + 3600,
  };
  const header = { alg: "RS256", typ: "JWT" };
  const headerB64 = b64url(JSON.stringify(header));
  const claimB64 = b64url(JSON.stringify(claim));
  const sigBase = headerB64 + "." + claimB64;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(sigBase);
  const sig = b64url(signer.sign(key.private_key));
  const jwt = sigBase + "." + sig;

  return postForm("https://oauth2.googleapis.com/token", {
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  }).then((r) => JSON.parse(r).access_token);
}

function postForm(url, fields) {
  const body = Object.entries(fields).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "content-length": Buffer.byteLength(body) } }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => (res.statusCode < 300 ? resolve(buf) : reject(new Error(`HTTP ${res.statusCode}: ${buf}`))));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function gscQuery(token, site, payload) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(url, { method: "POST", headers: { "authorization": "Bearer " + token, "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        if (res.statusCode >= 300) return reject(new Error(`GSC HTTP ${res.statusCode}: ${buf}`));
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function listSites(token) {
  return new Promise((resolve, reject) => {
    const req = https.request("https://searchconsole.googleapis.com/webmasters/v3/sites", { method: "GET", headers: { "authorization": "Bearer " + token } }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        if (res.statusCode >= 300) return reject(new Error(`GSC list HTTP ${res.statusCode}: ${buf}`));
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  if (!fs.existsSync(KEY_PATH)) {
    console.error("GSC key not found at", KEY_PATH);
    process.exit(2);
  }
  const key = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
  console.log("Auth as:", key.client_email);
  const token = await getAccessToken(key);
  console.log("Access token obtained.");

  // First check site list — verify service account has access
  let sites;
  try {
    sites = await listSites(token);
    console.log("Service account has access to:", (sites.siteEntry || []).map((s) => s.siteUrl).join(", ") || "(none)");
  } catch (e) {
    console.warn("listSites failed:", e.message);
  }

  const ourSite = (sites && sites.siteEntry || []).find((s) => s.siteUrl === SITE || s.siteUrl.replace(/\/$/, "") === SITE.replace(/\/$/, ""));
  if (!ourSite) {
    console.log("");
    console.log("⚠️  Service account is not yet a verified user of", SITE);
    console.log("    To enable GSC monitoring, add this email as a user in Search Console:");
    console.log("    →", key.client_email);
    console.log("    Then rerun. Until then, monitoring will fail.");
    const stub = {
      generatedAt: "2026-06-02",
      site: SITE,
      status: "service-account-not-authorised",
      serviceAccount: key.client_email,
      action: "Add this service account as a User in Search Console for the property, then rerun.",
    };
    fs.writeFileSync(path.join(OUT_DIR, "gsc-report.json"), JSON.stringify(stub, null, 2));
    process.exit(0);
  }

  const endDate = isoDaysAgo(2); // GSC has ~2 day lag
  const startDate = isoDaysAgo(2 + DAYS);
  console.log("Range:", startDate, "→", endDate);

  // Fetch query+page level data
  const data = await gscQuery(token, SITE, {
    startDate, endDate,
    dimensions: ["query", "page"],
    rowLimit: 5000,
  });
  const rows = data.rows || [];
  console.log("Rows:", rows.length);

  // Build buckets
  const striking = []; // position 5-20 — biggest upside
  const lowCtr = []; // top 50 impressions but CTR < 2% — weak title/snippet
  const queryToPages = new Map(); // cannibalisation

  for (const r of rows) {
    const [q, p] = r.keys;
    const rec = { query: q, page: p, impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position };
    if (r.position >= 5 && r.position <= 20 && r.impressions >= 5) striking.push(rec);
    if (r.impressions >= 50 && r.ctr < 0.02) lowCtr.push(rec);
    const list = queryToPages.get(q) || [];
    list.push(rec);
    queryToPages.set(q, list);
  }
  const cannibal = [];
  for (const [q, list] of queryToPages) {
    if (list.length >= 2) {
      const sorted = list.sort((a, b) => a.position - b.position);
      // only flag if at least two pages are within top-30
      if (sorted.filter((r) => r.position <= 30).length >= 2) cannibal.push({ query: q, urls: sorted });
    }
  }

  striking.sort((a, b) => b.impressions - a.impressions);
  lowCtr.sort((a, b) => b.impressions - a.impressions);
  cannibal.sort((a, b) => b.urls[0].impressions - a.urls[0].impressions);

  const report = {
    generatedAt: "2026-06-02",
    site: SITE,
    range: { startDate, endDate, days: DAYS },
    totals: {
      queries: queryToPages.size,
      rows: rows.length,
      clicks: rows.reduce((s, r) => s + (r.clicks || 0), 0),
      impressions: rows.reduce((s, r) => s + (r.impressions || 0), 0),
    },
    strikingDistance: striking.slice(0, 50),
    lowCtrHighImpressions: lowCtr.slice(0, 30),
    cannibalization: cannibal.slice(0, 30),
  };

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(OUT_DIR, "gsc-report.json"), JSON.stringify(report, null, 2));
  console.log("=== GSC Report ===");
  console.log("Clicks:", report.totals.clicks, "Impressions:", report.totals.impressions);
  console.log("Striking-distance opportunities:", striking.length);
  console.log("Low-CTR pages needing better title/desc:", lowCtr.length);
  console.log("Cannibalisation cases:", cannibal.length);
  console.log("Saved to: .secrets/gsc-report.json");
})().catch((e) => {
  console.error("GSC monitor failed:", e.message);
  process.exit(1);
});
