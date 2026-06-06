/**
 * NOLCOOL Autopilot — shared Cloudflare Worker (week1 / week2 / week3)
 *
 * Cron-triggered (09:00 KST = 00:00 UTC). For every site in sites.json it runs
 * READ-ONLY live checks against the deployed pages, then takes ONLY safe actions:
 *   - refresh discovery: IndexNow ping + Deploy Hook re-deploy (rebuild regenerates
 *     sitemap.xml AND re-runs the build gate in CI)
 *   - alert by email (Resend) on any failure, deduped via KV (self-cleaning)
 *
 * It NEVER edits content, payment, or security config — those are alert-only.
 * The build gate (scripts/gen-card-copy.js outputGate) remains the source of truth
 * and runs on every deploy; this Worker only watches the live result + nudges crawl.
 *
 * Bindings (wrangler.toml):
 *   KV  AUTOPILOT_KV         — alert dedup + run log (self-cleaning)
 *   var SITES                — JSON string of sites.json (or fetched asset)
 * Secrets (wrangler secret put):
 *   RESEND_API_KEY           — Resend (verified domain sender)
 *   ALERT_TO                 — theassetsquare@gmail.com
 *   ALERT_FROM               — e.g. autopilot@<verified-domain>
 *   DEPLOY_HOOK_<SITE>       — Cloudflare Pages Deploy Hook URL per site (optional)
 *   INDEXNOW_KEY             — IndexNow key (optional)
 *   PSI_KEY                  — PageSpeed Insights API key (optional; CWV)
 *   GSC_SA_JSON              — GSC service-account JSON (optional; index/searchanalytics)
 */

const GARBLE = /[㐀-䶿�]/g;            // CJK Ext-A salt glyphs + replacement char
const RISK = ["밤문화", "룸살롱", "룸싸롱", "노래방", "유흥", "초이스", "2차"];
const DARK = ["마감임박", "마감 임박", "품절", "매진", "곧 마감", "마지막 기회", "선착순 마감", "자리 없음"];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAll(env, "cron"));
  },
  // Manual trigger for testing: GET /?run=1
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.searchParams.get("run") === "1") {
      const report = await runAll(env, "manual");
      return new Response(JSON.stringify(report, null, 2), { headers: { "content-type": "application/json" } });
    }
    return new Response("NOLCOOL Autopilot. Use ?run=1 to trigger a manual check.", { status: 200 });
  },
};

async function runAll(env, trigger) {
  const sites = loadSites(env);
  const report = { trigger, ts: new Date().toISOString(), sites: [] };
  for (const site of sites) {
    const r = await checkSite(site, env).catch((e) => ({ id: site.id, error: String(e) }));
    report.sites.push(r);
    if (r.issues && r.issues.length) {
      await maybeAlert(site, r, env);
      await maybeRedeploy(site, env, r); // safe auto-fix: re-deploy (regenerates sitemap + re-runs gate)
    } else {
      await maybeIndexNow(site, env);    // healthy: just nudge crawl discovery
    }
  }
  await logRun(env, report);
  return report;
}

function loadSites(env) {
  try { return JSON.parse(env.SITES); } catch (e) { return []; }
}

async function checkSite(site, env) {
  const issues = [];
  const base = site.base.replace(/\/$/, "");

  // 1) sitemap reachable + collect URLs
  let urls = [];
  try {
    const sm = await (await fetch(base + "/sitemap.xml")).text();
    urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  } catch (e) { issues.push("sitemap unreachable: " + e); }
  if (!urls.length) issues.push("sitemap empty");

  // 2) soft-404: a known-missing path must NOT return 200
  try {
    const r = await fetch(base + "/__autopilot_missing_" + Date.now() + "/", { redirect: "manual" });
    if (r.status === 200) issues.push("SOFT-404: missing path returns 200");
  } catch (e) {}

  // 3) nolcool main link direct (200, no hop) — brand funnel integrity
  if (site.mainUrl) {
    try {
      const r = await fetch(site.mainUrl, { redirect: "manual" });
      if (r.status >= 300 && r.status < 400) issues.push("nolcool main not direct (redirect " + r.status + ")");
      else if (r.status >= 400) issues.push("nolcool main down (" + r.status + ")");
    } catch (e) { issues.push("nolcool main fetch failed"); }
  }

  // 4) content checks on a sample of pages (home + first/last venues + hubs)
  const sample = pickSample(urls, base, 12);
  for (const u of sample) {
    try {
      const res = await fetch(u);
      if (res.status !== 200) { issues.push("page " + res.status + ": " + path(u)); continue; }
      const html = await res.text();
      if (GARBLE.test(html)) issues.push("GARBLE glyphs in " + path(u));
      for (const w of RISK) if (html.includes(w)) issues.push("RISK '" + w + "' in " + path(u));
      for (const w of DARK) if (html.includes(w)) issues.push("DARK-PATTERN '" + w + "' in " + path(u));
      if (site.mainUrl && u.includes("/v/") && !html.includes('href="' + site.mainUrl + '"'))
        issues.push("nolcool CTA missing in " + path(u));
    } catch (e) { issues.push("fetch failed: " + path(u)); }
  }

  // 5) optional: PSI / GSC if keys present (honest: skipped when no key)
  const optional = {};
  if (env.PSI_KEY) optional.psi = await psiCheck(base + "/", env.PSI_KEY).catch((e) => "psi error");
  optional.gsc = env.GSC_SA_JSON ? "configured (run searchanalytics in extended mode)" : "no key — index/CWV not measured";

  return { id: site.id, base, urlCount: urls.length, sampled: sample.length, issues, optional };
}

function pickSample(urls, base, n) {
  if (!urls.length) return [base + "/"];
  const venues = urls.filter((u) => u.includes("/v/"));
  const hubs = urls.filter((u) => /\/(ranking|map|magazine|events|community|c)\b/.test(u));
  const set = new Set([base + "/", urls[0], urls[urls.length - 1]]);
  for (let i = 0; i < Math.min(6, venues.length); i++) set.add(venues[Math.floor((i / 6) * venues.length)]);
  for (let i = 0; i < Math.min(3, hubs.length); i++) set.add(hubs[i]);
  return [...set].slice(0, n);
}

function path(u) { try { return new URL(u).pathname; } catch (e) { return u; } }

async function psiCheck(url, key) {
  const api = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&url=" +
    encodeURIComponent(url) + "&key=" + key;
  const d = await (await fetch(api)).json();
  const s = d?.lighthouseResult?.categories?.performance?.score;
  return s != null ? Math.round(s * 100) : "n/a";
}

/* ── SAFE AUTO-FIX: IndexNow ping (discovery only) ── */
async function maybeIndexNow(site, env) {
  if (!env.INDEXNOW_KEY || !site.base) return;
  const host = new URL(site.base).host;
  const body = {
    host,
    key: env.INDEXNOW_KEY,
    keyLocation: site.base.replace(/\/$/, "") + "/" + env.INDEXNOW_KEY + ".txt",
    urlList: [site.base.replace(/\/$/, "") + "/"],
  };
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
  } catch (e) {}
}

/* ── SAFE AUTO-FIX: re-deploy via Pages Deploy Hook (rebuilds sitemap + re-runs gate) ── */
async function maybeRedeploy(site, env, r) {
  const hook = env["DEPLOY_HOOK_" + site.id.toUpperCase()];
  // Only re-deploy for issues a rebuild can actually fix (sitemap/discovery), NOT content/security.
  const rebuildable = r.issues.some((i) => /sitemap|SOFT-404|page 404|page 5\d\d/.test(i));
  const sensitive = r.issues.some((i) => /GARBLE|RISK|DARK-PATTERN|nolcool/.test(i));
  if (hook && rebuildable && !sensitive) {
    try { await fetch(hook, { method: "POST" }); } catch (e) {}
  }
  // sensitive issues are ALERT-ONLY (never auto-fixed) — handled by maybeAlert
}

/* ── ALERT: Resend, [WEEK3-]-tagged, KV-deduped (self-cleaning) ── */
async function maybeAlert(site, r, env) {
  if (!env.RESEND_API_KEY || !env.ALERT_TO) return;
  const sig = site.id + ":" + r.issues.slice().sort().join("|");
  const fp = await sha(sig);
  const kvKey = "alert:" + fp;
  if (env.AUTOPILOT_KV) {
    const seen = await env.AUTOPILOT_KV.get(kvKey);
    if (seen) return; // already alerted for this exact issue set today
    await env.AUTOPILOT_KV.put(kvKey, "1", { expirationTtl: 60 * 60 * 22 }); // self-clean ~22h (before next run)
  }
  const tag = "[" + site.id.toUpperCase() + "-AUTOPILOT]";
  const subject = tag + " " + r.issues.length + " issue(s) on " + site.base;
  const text = subject + "\n\n" + r.issues.map((i) => " - " + i).join("\n") +
    "\n\nSafe auto-fix: " + (r.issues.some((i) => /sitemap|SOFT-404|404|5\d\d/.test(i)) ? "re-deploy triggered" : "none (alert-only — content/security needs human)") +
    "\n\nRun: " + r.base + "/  @ " + new Date().toISOString();
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ from: env.ALERT_FROM || "autopilot@nolcool.com", to: [env.ALERT_TO], subject, text }),
    });
  } catch (e) {}
}

async function logRun(env, report) {
  if (!env.AUTOPILOT_KV) return;
  try { await env.AUTOPILOT_KV.put("lastrun", JSON.stringify(report), { expirationTtl: 60 * 60 * 24 * 7 }); } catch (e) {}
}

async function sha(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
