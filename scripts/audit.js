const fs = require("fs");
const path = require("path");

const vDir = path.join(__dirname, "..", "v");
const venues = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "venues.json"), "utf8"));
const slugs = fs.readdirSync(vDir).filter(d => fs.statSync(path.join(vDir, d)).isDirectory());

function extractText(html) {
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

function getNgrams(text, n) {
  var set = new Set();
  for (var i = 0; i <= text.length - n; i++) set.add(text.substring(i, i + n));
  return set;
}

function jaccard(a, b) {
  var inter = 0;
  a.forEach(v => { if (b.has(v)) inter++; });
  var union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

var pages = [];
slugs.forEach(slug => {
  var fp = path.join(vDir, slug, "index.html");
  if (!fs.existsSync(fp)) return;
  var html = fs.readFileSync(fp, "utf8");
  var text = extractText(html);
  pages.push({ slug, text, html });
});

console.log("=== 총 페이지 수:", pages.length, "===\n");

// 1. Similarity
console.log("=== 유사도 분석 ===");
var simPairs = [];
for (var i = 0; i < pages.length; i++) {
  var ng1 = getNgrams(pages[i].text, 5);
  for (var j = i + 1; j < pages.length; j++) {
    var ng2 = getNgrams(pages[j].text, 5);
    simPairs.push({ a: pages[i].slug, b: pages[j].slug, sim: jaccard(ng1, ng2) });
  }
}
simPairs.sort((a, b) => b.sim - a.sim);
console.log("상위 10:");
simPairs.slice(0, 10).forEach(p => {
  console.log("  " + p.a + " <-> " + p.b + ": " + (p.sim * 100).toFixed(1) + "%");
});
var over5 = simPairs.filter(p => p.sim > 0.05).length;
console.log("5% 초과: " + over5 + " / " + simPairs.length + "\n");

// 2. Keyword Stuffing
console.log("=== 키워드 스터핑 ===");
var stuffCount = 0;
slugs.forEach(slug => {
  var fp = path.join(vDir, slug, "index.html");
  if (!fs.existsSync(fp)) return;
  var html = fs.readFileSync(fp, "utf8");
  var text = extractText(html);
  var words = text.match(/[가-힣]{2,}/g) || [];
  var total = words.length;
  var freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  var stuffed = Object.entries(freq)
    .filter(([w, c]) => c >= 5 && (c / total * 100) > 1.5)
    .sort((a, b) => b[1] - a[1]);
  if (stuffed.length > 0) {
    stuffCount++;
    console.log(slug + " (" + total + "어절):");
    stuffed.forEach(([w, c]) => console.log("  " + w + ": " + c + "회 (" + (c / total * 100).toFixed(1) + "%)"));
  }
});
console.log("스터핑 페이지: " + stuffCount + "/" + pages.length + "\n");

// 3. Store name per section
console.log("=== 가게이름 (서론/본론/결론) ===");
venues.forEach((v) => {
  var slug = slugs.find(s => s.startsWith(v.name) || s.includes(v.name));
  if (!slug) return;
  var fp = path.join(vDir, slug, "index.html");
  if (!fs.existsSync(fp)) return;
  var html = fs.readFileSync(fp, "utf8");

  function countInSection(regex) {
    var match = html.match(regex);
    if (!match) return 0;
    var text = extractText(match[1]);
    var nameRe = new RegExp(v.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    return (text.match(nameRe) || []).length;
  }

  var sum = countInSection(/<section class="detail-summary">([\s\S]*?)<\/section>/);
  var intro = countInSection(/<section class="detail-intro">([\s\S]*?)<\/section>/);
  var story = countInSection(/<section class="detail-story">([\s\S]*?)<\/section>/);
  var qp = countInSection(/<section class="detail-quickplan">([\s\S]*?)<\/section>/);
  var faq = countInSection(/<section class="detail-faq">([\s\S]*?)<\/section>/);
  var conc = countInSection(/<section class="detail-conclusion">([\s\S]*?)<\/section>/);
  var total = sum + intro + story + qp + faq + conc;
  var status = total < 6 ? "UNDER" : total > 12 ? "OVER" : "OK";
  console.log(v.region + " " + v.name + ": S=" + sum + " I=" + intro + " B=" + story + " Q=" + qp + " F=" + faq + " C=" + conc + " T=" + total + " [" + status + "]");
});
