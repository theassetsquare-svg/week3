#!/usr/bin/env node
/**
 * audit-pages.js — 전체 페이지 분석
 * 1. 유사도 체크 (페이지 간 텍스트 유사도)
 * 2. 키워드 스터핑 체크
 * 3. 가게이름 분포 분석 (서론/본론/결론)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const venues = JSON.parse(fs.readFileSync(path.join(ROOT, "venues.json"), "utf-8"));
const vDir = path.join(ROOT, "v");

/* ── Helpers ── */
function stripHtml(html) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract specific sections from HTML
function extractSections(html) {
  // Intro section
  const introMatch = html.match(/class="detail-intro"[^>]*>([\s\S]*?)(?=<section class="detail-info"|<div class="detail-info")/i);
  const intro = introMatch ? stripHtml(introMatch[1]) : "";

  // Story/body section
  const storyMatch = html.match(/class="detail-story"[^>]*>([\s\S]*?)(?=<section class="detail-quickplan"|<div class="detail-quickplan")/i);
  const story = storyMatch ? stripHtml(storyMatch[1]) : "";

  // Conclusion section
  const conclusionMatch = html.match(/class="detail-conclusion"[^>]*>([\s\S]*?)(?=<footer|<div class="detail-cta"|$)/i);
  const conclusion = conclusionMatch ? stripHtml(conclusionMatch[1]) : "";

  // FAQ section
  const faqMatch = html.match(/class="detail-faq"[^>]*>([\s\S]*?)(?=<section class="detail-conclusion"|<div class="detail-conclusion")/i);
  const faq = faqMatch ? stripHtml(faqMatch[1]) : "";

  // Summary section
  const summaryMatch = html.match(/class="detail-summary"[^>]*>([\s\S]*?)(?=<section class="detail-intro"|<div class="detail-intro")/i);
  const summary = summaryMatch ? stripHtml(summaryMatch[1]) : "";

  // QuickPlan section
  const qpMatch = html.match(/class="detail-quickplan"[^>]*>([\s\S]*?)(?=<section class="detail-faq"|<div class="detail-faq")/i);
  const quickPlan = qpMatch ? stripHtml(qpMatch[1]) : "";

  return { intro, story, conclusion, faq, summary, quickPlan };
}

// Shingling for similarity
function getShingles(text, n) {
  const words = text.replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const shingles = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    shingles.add(words.slice(i, i + n).join(" "));
  }
  return shingles;
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Load all pages
const pages = [];
const slugToVenue = {};

// Build slug mapping
const { dedupeSlug } = (() => {
  function dedupeSlug(name, region) {
    const base = name + "-" + region;
    const nameNorm = name.replace(/[\s·]/g, "").toLowerCase();
    const regionNorm = region.replace(/[\s·]/g, "").toLowerCase();
    if (nameNorm.includes(regionNorm)) return name;
    return base;
  }
  return { dedupeSlug };
})();

for (const v of venues) {
  const slug = dedupeSlug(v.name, v.region);
  const pagePath = path.join(vDir, slug, "index.html");
  if (!fs.existsSync(pagePath)) continue;
  
  const html = fs.readFileSync(pagePath, "utf-8");
  const fullText = stripHtml(html);
  const sections = extractSections(html);
  
  // fullName = region + type_keyword + name
  // Actually, _fullName is built in gen-card-copy.js
  // For analysis, let's derive it: region + "룸 " + name + type(if 요정)
  // Better: extract from <title>
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const titleText = titleMatch ? titleMatch[1].split("—")[0].trim() : "";
  const fullName = titleText || (v.region + " " + v.name);
  
  pages.push({
    slug,
    name: v.name,
    region: v.region,
    type: v.type,
    fullName,
    fullText,
    sections,
    html,
    shingles: getShingles(fullText, 5)
  });
  slugToVenue[slug] = v;
}

console.log("=".repeat(80));
console.log("                    전체 페이지 분석 리포트");
console.log("=".repeat(80));
console.log(`분석 대상: ${pages.length}개 페이지\n`);

/* ══════════ 1. 유사도 분석 ══════════ */
console.log("━".repeat(80));
console.log("  1. 페이지 간 유사도 분석 (Jaccard 5-gram)");
console.log("━".repeat(80));

const simResults = [];
for (let i = 0; i < pages.length; i++) {
  for (let j = i + 1; j < pages.length; j++) {
    const sim = jaccardSimilarity(pages[i].shingles, pages[j].shingles);
    simResults.push({
      a: pages[i].fullName,
      b: pages[j].fullName,
      similarity: sim
    });
  }
}

simResults.sort((a, b) => b.similarity - a.similarity);

const over5 = simResults.filter(r => r.similarity > 0.05);
const over10 = simResults.filter(r => r.similarity > 0.10);
const over20 = simResults.filter(r => r.similarity > 0.20);

console.log(`\n총 비교 쌍: ${simResults.length}`);
console.log(`유사도 > 20%: ${over20.length}개`);
console.log(`유사도 > 10%: ${over10.length}개`);
console.log(`유사도 > 5%: ${over5.length}개`);

if (over5.length > 0) {
  console.log(`\n⚠️  유사도 5% 초과 목록 (상위 30개):`);
  over5.slice(0, 30).forEach((r, i) => {
    console.log(`  ${i+1}. [${(r.similarity * 100).toFixed(1)}%] ${r.a} ↔ ${r.b}`);
  });
}

// Average similarity
const avgSim = simResults.reduce((s, r) => s + r.similarity, 0) / simResults.length;
console.log(`\n평균 유사도: ${(avgSim * 100).toFixed(2)}%`);

/* ══════════ 2. 키워드 스터핑 체크 ══════════ */
console.log("\n" + "━".repeat(80));
console.log("  2. 키워드 스터핑 분석");
console.log("━".repeat(80));

let totalStuffingPages = 0;
const stuffingReport = [];

for (const page of pages) {
  // Count all Korean word occurrences (2+ chars)
  const text = page.fullText;
  const words = text.match(/[가-힣]{2,}/g) || [];
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  // Find words with excessive repetition (> 6 times = keyword stuffing)
  const STUFFING_THRESHOLD = 6;
  const stuffed = Object.entries(freq)
    .filter(([w, c]) => c > STUFFING_THRESHOLD)
    .filter(([w]) => {
      // Exclude common particles/connectors/short words
      const skipWords = new Set(["있습니다","가능합니다","됩니다","있으며","있다","있는","없는","있으니","있어","하는","가능한","하면","하자","있고","않는","않다","아닌","에서","까지","부터","대한","대해","위한","통해","할수","때문","경우","이상","이하","이후","이전","시간","분위기","확인","안내","문의","전화","주문","추천","선택","가격","음료","예약","귀가","인원","도착","주말","평일"]);
      return !skipWords.has(w);
    })
    .sort((a, b) => b[1] - a[1]);

  if (stuffed.length > 0) {
    totalStuffingPages++;
    stuffingReport.push({ page: page.fullName, stuffed });
  }
}

console.log(`\n키워드 스터핑 페이지 수: ${totalStuffingPages} / ${pages.length}`);
if (stuffingReport.length > 0) {
  stuffingReport.forEach(r => {
    console.log(`\n  ⚠️  ${r.page}:`);
    r.stuffed.forEach(([w, c]) => {
      console.log(`      "${w}" → ${c}회`);
    });
  });
} else {
  console.log("  ✅ 키워드 스터핑 없음");
}

// Also check for fullName keyword stuffing specifically
console.log("\n--- 가게이름(fullName) 전체 페이지 출현 빈도 ---");
let nameStuffingCount = 0;
for (const page of pages) {
  const nameEsc = page.fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = page.fullText.match(new RegExp(nameEsc, "g"));
  const count = matches ? matches.length : 0;
  if (count > 12) {
    nameStuffingCount++;
    console.log(`  ⚠️  ${page.fullName}: ${count}회 (과다)`);
  }
}
if (nameStuffingCount === 0) {
  console.log("  ✅ 가게이름 과다 반복 없음 (모두 12회 이하)");
}

/* ══════════ 3. 가게이름 분포 분석 (서론/본론/결론) ══════════ */
console.log("\n" + "━".repeat(80));
console.log("  3. 가게이름 SEO 분포 분석 (서론/본론/결론)");
console.log("━".repeat(80));

console.log("\n[SEO 권장: 서론 1-2회, 본론 2-4회, 결론 1-2회]\n");

let issueCount = 0;
const nameDistribution = [];

for (const page of pages) {
  const fn = page.fullName;
  const fnEsc = fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(fnEsc, "g");

  const introCount = (page.sections.intro.match(re) || []).length;
  const storyCount = (page.sections.story.match(re) || []).length;
  const conclusionCount = (page.sections.conclusion.match(re) || []).length;
  const summaryCount = (page.sections.summary.match(re) || []).length;
  const faqCount = (page.sections.faq.match(re) || []).length;
  const qpCount = (page.sections.quickPlan.match(re) || []).length;
  const totalBody = introCount + storyCount + conclusionCount;
  const totalAll = summaryCount + introCount + storyCount + qpCount + faqCount + conclusionCount;

  const issues = [];
  if (introCount === 0) issues.push("서론 0회");
  if (storyCount === 0) issues.push("본론 0회");
  if (conclusionCount === 0) issues.push("결론 0회");
  if (introCount > 3) issues.push(`서론 ${introCount}회 과다`);
  if (storyCount > 5) issues.push(`본론 ${storyCount}회 과다`);
  if (conclusionCount > 3) issues.push(`결론 ${conclusionCount}회 과다`);

  nameDistribution.push({
    name: fn,
    summary: summaryCount,
    intro: introCount,
    story: storyCount,
    quickPlan: qpCount,
    faq: faqCount,
    conclusion: conclusionCount,
    total: totalAll,
    issues
  });

  if (issues.length > 0) issueCount++;
}

// Print table
console.log("가게이름".padEnd(30) + "요약  서론  본론  QP   FAQ  결론  합계  문제");
console.log("-".repeat(100));
nameDistribution.forEach(d => {
  const marker = d.issues.length > 0 ? "⚠️  " + d.issues.join(", ") : "✅";
  console.log(
    d.name.padEnd(30) +
    String(d.summary).padStart(3) + "   " +
    String(d.intro).padStart(3) + "   " +
    String(d.story).padStart(3) + "   " +
    String(d.quickPlan).padStart(3) + "   " +
    String(d.faq).padStart(3) + "   " +
    String(d.conclusion).padStart(3) + "   " +
    String(d.total).padStart(3) + "   " +
    marker
  );
});

console.log(`\n문제 있는 페이지: ${issueCount} / ${pages.length}`);

/* ══════════ Summary ══════════ */
console.log("\n" + "=".repeat(80));
console.log("  종합 요약");
console.log("=".repeat(80));
console.log(`1. 유사도 5% 초과: ${over5.length}쌍 (평균 ${(avgSim * 100).toFixed(2)}%)`);
console.log(`2. 키워드 스터핑: ${totalStuffingPages}개 페이지`);
console.log(`3. 가게이름 분포 문제: ${issueCount}개 페이지`);
