#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const venues = JSON.parse(fs.readFileSync(path.join(ROOT, "venues.json"), "utf-8"));
const vDir = path.join(ROOT, "v");

function stripHtml(html) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function dedupeSlug(name, region) {
  var nameNorm = name.replace(/[\s·]/g, "").toLowerCase();
  var regionNorm = region.replace(/[\s·]/g, "").toLowerCase();
  if (nameNorm.includes(regionNorm)) return name;
  return name + "-" + region;
}

function extractSection(html, startClass, endClasses) {
  var startRe = new RegExp('class="[^"]*' + startClass + '[^"]*"[^>]*>([\\s\\S]*)', 'i');
  var m = html.match(startRe);
  if (!m) return "";
  var content = m[1];
  for (var ec of endClasses) {
    var endRe = new RegExp('class="[^"]*' + ec + '[^"]*"', 'i');
    var em = content.search(endRe);
    if (em > 0) {
      // Backtrack to find the opening tag
      var lastTag = content.lastIndexOf("<", em);
      if (lastTag > 0) content = content.substring(0, lastTag);
      break;
    }
  }
  return stripHtml(content);
}

const pages = [];
for (const v of venues) {
  var cleanName = v.name.replace(/\s*\(.*?\)/g, "").trim();
  var fullName;
  if (cleanName === "명월관" && v.region === "일산") fullName = "일산룸 명월관요정";
  else fullName = v.region + "룸 " + cleanName;
  
  var slug = dedupeSlug(v.name, v.region);
  var pagePath = path.join(vDir, slug, "index.html");
  if (!fs.existsSync(pagePath)) continue;
  
  var html = fs.readFileSync(pagePath, "utf-8");
  var fullText = stripHtml(html);
  
  var intro = extractSection(html, "detail-section--intro", ["detail-section--info", "detail-info"]);
  var story = extractSection(html, "detail-story", ["detail-section--quickplan"]);
  var conclusion = extractSection(html, "detail-section--conclusion", ["detail-footer", "detail-cta"]);
  var summary = extractSection(html, "detail-section--summary", ["detail-section--intro"]);
  var faq = extractSection(html, "detail-section--faq", ["detail-section--conclusion"]);
  var quickPlan = extractSection(html, "detail-section--quickplan", ["detail-section--faq"]);
  
  pages.push({ slug, fullName, fullText, intro, story, conclusion, summary, faq, quickPlan, region: v.region, type: v.type });
}

console.log("=".repeat(80));
console.log("         정밀 분석 리포트 — " + pages.length + "개 페이지");
console.log("=".repeat(80));

// ── 3. Name Distribution ──
console.log("\n━━ 가게이름 SEO 분포 분석 ━━");
console.log("[SEO 권장: 서론 1-2, 본론 2-4, 결론 1-2, 합계 6-8]\n");
console.log("가게이름".padEnd(25) + "요약 서론 본론  QP  FAQ 결론 합계 상태");
console.log("-".repeat(85));

var nameIssues = 0;
for (const p of pages) {
  var fn = p.fullName;
  var re = new RegExp(fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  var s = (p.summary.match(re)||[]).length;
  var i = (p.intro.match(re)||[]).length;
  var st = (p.story.match(re)||[]).length;
  var qp = (p.quickPlan.match(re)||[]).length;
  var f = (p.faq.match(re)||[]).length;
  var c = (p.conclusion.match(re)||[]).length;
  var tot = s+i+st+qp+f+c;
  
  var issues = [];
  if (i < 1) issues.push("서론↓");
  if (st < 2) issues.push("본론↓("+st+")");
  if (c < 1) issues.push("결론↓");
  if (tot > 10) issues.push("과다("+tot+")");
  if (issues.length > 0) nameIssues++;
  
  console.log(
    fn.padEnd(25) +
    String(s).padStart(3) + "  " +
    String(i).padStart(3) + "  " +
    String(st).padStart(3) + "  " +
    String(qp).padStart(3) + "  " +
    String(f).padStart(3) + "  " +
    String(c).padStart(3) + "  " +
    String(tot).padStart(3) + "  " +
    (issues.length > 0 ? "⚠️ " + issues.join(", ") : "✅")
  );
}
console.log(`\n문제 있는 페이지: ${nameIssues} / ${pages.length}`);

// ── 2. Keyword Stuffing ──
console.log("\n━━ 키워드 스터핑 분석 ━━");
var stuffCount = 0;
for (const p of pages) {
  var words = p.fullText.match(/[가-힣]{2,}/g) || [];
  var freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  var over = Object.entries(freq).filter(([w, c]) => c > 6).sort((a, b) => b[1] - a[1]);
  if (over.length > 0) {
    stuffCount++;
    console.log(`  ${p.fullName}: ${over.map(([w,c]) => w+"("+c+")").join(", ")}`);
  }
}
console.log(`\n키워드 스터핑 페이지: ${stuffCount} / ${pages.length}`);

// ── 1. Similarity ──
console.log("\n━━ 유사도 분석 (5-gram Jaccard) ━━");
function getShingles(text, n) {
  var words = text.replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  var set = new Set();
  for (var i = 0; i <= words.length - n; i++) set.add(words.slice(i, i + n).join(" "));
  return set;
}
function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  var inter = 0;
  for (var x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Compare stories only (not meta/header/footer) for true content similarity
var shingles = pages.map(p => getShingles(p.intro + " " + p.story + " " + p.conclusion, 5));
var sims = [];
for (var i = 0; i < pages.length; i++) {
  for (var j = i + 1; j < pages.length; j++) {
    sims.push({ a: pages[i].fullName, b: pages[j].fullName, sim: jaccard(shingles[i], shingles[j]) });
  }
}
sims.sort((a, b) => b.sim - a.sim);
var over5 = sims.filter(s => s.sim > 0.05);
var avg = sims.reduce((s, r) => s + r.sim, 0) / sims.length;

console.log(`평균 유사도: ${(avg * 100).toFixed(2)}%`);
console.log(`5% 초과 쌍: ${over5.length} / ${sims.length}`);
console.log(`\n상위 20개:`);
sims.slice(0, 20).forEach((r, i) => {
  console.log(`  ${i+1}. [${(r.sim * 100).toFixed(1)}%] ${r.a} ↔ ${r.b}`);
});
