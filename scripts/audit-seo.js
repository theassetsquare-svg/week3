#!/usr/bin/env node
/**
 * audit-seo.js — Keyword Density + Similarity + Title Dups + Stuffing
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const venues = JSON.parse(fs.readFileSync(path.join(ROOT, "venues.json"), "utf8"));

function makeSlug(name, region) {
  var clean = name.replace(/\s*\(.*?\)/g,"").trim();
  clean = clean.replace(/[^가-힣a-zA-Z0-9]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  return clean + "-" + region;
}
function dedupeSlug(slug, region) {
  var suffix = "-" + region;
  var namePart = slug.slice(0, slug.length - suffix.length);
  if (namePart.includes(region)) return namePart;
  return slug;
}

venues.forEach(function(v){
  if(v.slug) v._slug = v.slug;
  else { var raw = makeSlug(v.name, v.region); v._slug = dedupeSlug(raw, v.region); }
});

function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi,'')
    .replace(/<style[\s\S]*?<\/style>/gi,'')
    .replace(/<[^>]+>/g,'')
    .replace(/&[a-z#0-9]+;/gi,' ')
    .replace(/\s+/g,'');
}

function extractBody(html) {
  // Extract editorial PARAGRAPH text only (skip headings, engagement sections, nav, footer)
  var content = '';
  var sections = html.split('<div class="detail-section">');
  sections.forEach(function(sec){
    if(sec.indexOf('detail-body')>=0 || sec.indexOf('summary-list')>=0 || sec.indexOf('faq-item')>=0){
      // Strip headings (H1-H3) before extracting text — headings are NOT paragraphs
      var cleaned = sec.replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi,'');
      content += stripHtml(cleaned);
    }
  });
  return content;
}

function calcDensity(text, name) {
  var nc = name.replace(/\s/g,'');
  var nl = nc.length;
  var count = 0, pos = 0;
  while((pos=text.indexOf(nc,pos))!==-1){count++;pos+=nl;}
  return {count:count, chars:text.length, density: text.length>0?(count*nl)/text.length*100:0};
}

// 8-char phrase n-grams for similarity (phrase-level, like Google)
function getPhrases(text) {
  var set = new Set();
  var N = 20; // sentence-level — matches Korean plagiarism checkers (CopyKiller)
  for(var i=0;i<=text.length-N;i++) set.add(text.slice(i,i+N));
  return set;
}
function jaccard(a, b) {
  var inter = 0;
  a.forEach(function(v){if(b.has(v))inter++;});
  var union = a.size + b.size - inter;
  return union>0 ? inter/union*100 : 0;
}

// Title duplicate word check
function titleDups(title) {
  // Extract 2+ char Korean words
  var words = title.match(/[가-힣]{2,}/g) || [];
  // Check if any word is substring of another or appears twice
  var dups = [];
  for(var i=0;i<words.length;i++){
    for(var j=i+1;j<words.length;j++){
      if(words[i].length>=2 && words[j].includes(words[i])) dups.push(words[i]);
      if(words[j].length>=2 && words[i].includes(words[j])) dups.push(words[j]);
    }
  }
  return [...new Set(dups)];
}

// Stuffing check: same keyword 2+ in one sentence, 3+ in 200-char window
function checkStuffing(text, name) {
  var nc = name.replace(/\s/g,'');
  if(nc.length<2) return false;
  // Sentence-level (split by Korean sentence endings)
  var sentences = text.split(/[.!?。]/);
  for(var s=0;s<sentences.length;s++){
    var c=0,p=0;
    while((p=sentences[s].indexOf(nc,p))!==-1){c++;p+=nc.length;}
    if(c>=2) return true;
  }
  // 200-char window
  for(var i=0;i<text.length-200;i+=50){
    var w=text.slice(i,i+200);
    var c2=0,p2=0;
    while((p2=w.indexOf(nc,p2))!==-1){c2++;p2+=nc.length;}
    if(c2>=3) return true;
  }
  return false;
}

// Read all pages
var pages = [];
venues.forEach(function(v){
  var fp = path.join(ROOT,"v",v._slug,"index.html");
  if(!fs.existsSync(fp)) return;
  var html = fs.readFileSync(fp,"utf8");
  var tm = html.match(/<title>([^<]+)<\/title>/);
  var title = tm ? tm[1] : '';
  var body = extractBody(html);
  var full = stripHtml(html);
  var d = calcDensity(full, v.name);
  pages.push({
    slug: v._slug, name: v.name, title: title,
    body: body, full: full,
    density: d, titleDups: titleDups(title),
    stuffing: checkStuffing(body, v.name),
    phrases: getPhrases(body)
  });
});

// Pairwise similarity — report max per page
console.error("Calculating similarity for "+pages.length+" pages...");
pages.forEach(function(p,i){
  var maxSim=0, maxWith='';
  for(var j=0;j<pages.length;j++){
    if(i===j) continue;
    var sim = jaccard(p.phrases, pages[j].phrases);
    if(sim>maxSim){maxSim=sim;maxWith=pages[j].slug;}
  }
  p.similarity = maxSim;
  p.simWith = maxWith;
});

// Report
console.log("| 페이지 | 가게이름 | 본문길이 | 키워드횟수 | 밀도% | 유사도% | 스터핑 |");
console.log("|--------|---------|---------|----------|-------|--------|-------|");
var dFail=0, sFail=0, stFail=0, tFail=0;
pages.forEach(function(p){
  var dOk = p.density.density>=1.5 && p.density.density<=2.5;
  var sOk = p.similarity<10;
  var stOk = !p.stuffing;
  var tOk = p.titleDups.length===0;
  if(!dOk) dFail++;
  if(!sOk) sFail++;
  if(!stOk) stFail++;
  if(!tOk) tFail++;
  console.log("| "+p.slug+" | "+p.name+" | "+p.density.chars+"자 | "+
    p.density.count+"회 | "+p.density.density.toFixed(1)+"% "+(dOk?"✅":"❌")+" | "+
    p.similarity.toFixed(1)+"% "+(sOk?"✅":"❌")+" | "+
    (stOk?"없음 ✅":"있음 ❌")+" |");
  if(!tOk) console.log("  ⚠ Title 중복: ["+p.titleDups.join(", ")+"] → "+p.title);
});
console.log("");
console.log("밀도 이슈: "+dFail+"개 | 유사도 이슈: "+sFail+"개 | 스터핑: "+stFail+"개 | 제목중복: "+tFail+"개");
console.log("총 "+pages.length+"페이지");
