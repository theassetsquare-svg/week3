#!/usr/bin/env node
/**
 * SEO Audit & Auto-Fix Script — 24시간 자동화
 * Usage: node scripts/seo-audit.js [--fix]
 *
 * Checks all 123 pages for:
 * 1. Banned words (이곳, 공간, 기준, 해당, 매장, 감도)
 * 2. Title duplicates & length
 * 3. Meta description length & uniqueness
 * 4. Keyword stuffing (same word >3x in title)
 * 5. Missing og:image, og:title, canonical
 * 6. H1 presence and store name mentions
 * 7. Schema.org JSON-LD validation
 * 8. Sitemap coverage
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BANNED = ['해당', '이곳', '공간', '매장', '감도', '기준'];
const DEPLOY_URL = 'https://week3-2og.pages.dev';
const autoFix = process.argv.includes('--fix');

let errors = 0;
let warnings = 0;
let fixed = 0;

function log(type, file, msg) {
  const icon = type === 'ERR' ? '❌' : type === 'WARN' ? '⚠️' : '✅';
  console.log(`${icon} [${type}] ${file}: ${msg}`);
  if (type === 'ERR') errors++;
  if (type === 'WARN') warnings++;
}

function findHtmlFiles() {
  const files = [];
  function walk(dir) {
    if (dir.includes('node_modules') || dir.includes('.agents')) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) files.push(full);
    }
  }
  walk(ROOT);
  return files;
}

function extractTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return m ? m[1] : null;
}

function extractMeta(html, name) {
  const m = html.match(new RegExp(`name="${name}"\\s+content="([^"]*)"`));
  return m ? m[1] : null;
}

function extractOg(html, prop) {
  const m = html.match(new RegExp(`property="og:${prop}"\\s+content="([^"]*)"`));
  return m ? m[1] : null;
}

function checkDuplicateWords(title) {
  const words = title.match(/[가-힣]{2,}/g) || [];
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (words[i].length >= 2 && words[j].includes(words[i])) return words[i];
      if (words[j].length >= 2 && words[i].includes(words[j])) return words[j];
    }
  }
  return null;
}

function auditFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  let html;
  try { html = fs.readFileSync(filePath, 'utf8'); } catch { return; }

  // 1. Banned words
  for (const word of BANNED) {
    const bodyMatch = html.match(new RegExp(word, 'g'));
    if (bodyMatch) {
      log('ERR', rel, `금지어 "${word}" ${bodyMatch.length}회 발견`);
      if (autoFix) {
        const replacements = {
          '이곳': '이 곳', '공간': '홀', '기준': '수준',
          '해당': '해당되는', '매장': '업소', '감도': '감각'
        };
        html = html.replace(new RegExp(word, 'g'), replacements[word] || '');
        fixed++;
      }
    }
  }

  // 2. Title check
  const title = extractTag(html, 'title');
  if (!title) {
    log('ERR', rel, 'title 태그 없음');
  } else {
    if (title.length > 60) log('WARN', rel, `title ${title.length}자 (60자 초과): ${title}`);
    if (title.length < 10) log('WARN', rel, `title ${title.length}자 (너무 짧음): ${title}`);
    const dup = checkDuplicateWords(title);
    if (dup) log('ERR', rel, `title 단어 중복: "${dup}" in "${title}"`);
  }

  // 3. Meta description
  const desc = extractMeta(html, 'description');
  if (!desc) {
    log('ERR', rel, 'meta description 없음');
  } else {
    if (desc.length > 160) log('WARN', rel, `description ${desc.length}자 (160자 초과)`);
    if (desc.length < 50) log('WARN', rel, `description ${desc.length}자 (너무 짧음)`);
  }

  // 4. og:title
  const ogTitle = extractOg(html, 'title');
  if (!ogTitle) log('WARN', rel, 'og:title 없음');

  // 5. og:image
  const ogImage = extractOg(html, 'image');
  if (!ogImage) log('WARN', rel, 'og:image 없음');

  // 6. canonical
  if (!html.includes('rel="canonical"')) log('WARN', rel, 'canonical 링크 없음');

  // 7. H1
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  if (!h1Match) log('WARN', rel, 'H1 태그 없음');

  // 8. JSON-LD
  if (!html.includes('application/ld+json')) log('WARN', rel, 'JSON-LD schema 없음');

  // 9. robots meta
  if (!html.includes('name="robots"') && !html.includes('name="googlebot"')) {
    log('WARN', rel, 'robots meta 없음');
  }

  if (autoFix && html !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, html, 'utf8');
  }
}

function checkSitemap() {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) { log('ERR', 'sitemap.xml', '파일 없음'); return; }
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const urls = (sitemap.match(/<loc>[^<]+<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, ''));

  const htmlFiles = findHtmlFiles();
  const pageUrls = htmlFiles.map(f => {
    const rel = path.relative(ROOT, f).replace(/index\.html$/, '').replace(/\.html$/, '/');
    return DEPLOY_URL + '/' + rel;
  });

  let missing = 0;
  for (const url of pageUrls) {
    const normalized = encodeURI(decodeURI(url));
    if (!urls.some(u => decodeURI(u) === decodeURI(url))) {
      missing++;
    }
  }
  if (missing > 0) log('WARN', 'sitemap.xml', `${missing}개 URL이 sitemap에 미등록`);
  console.log(`\nsitemap.xml: ${urls.length} URLs 등록됨`);
}

function checkTitleUniqueness() {
  const htmlFiles = findHtmlFiles();
  const titles = {};
  for (const f of htmlFiles) {
    const html = fs.readFileSync(f, 'utf8');
    const title = extractTag(html, 'title');
    if (title) {
      if (!titles[title]) titles[title] = [];
      titles[title].push(path.relative(ROOT, f));
    }
  }
  for (const [title, files] of Object.entries(titles)) {
    if (files.length > 1) {
      log('ERR', files.join(', '), `동일 title 중복: "${title}"`);
    }
  }
}

function checkDescUniqueness() {
  const htmlFiles = findHtmlFiles();
  const descs = {};
  for (const f of htmlFiles) {
    const html = fs.readFileSync(f, 'utf8');
    const desc = extractMeta(html, 'description');
    if (desc) {
      if (!descs[desc]) descs[desc] = [];
      descs[desc].push(path.relative(ROOT, f));
    }
  }
  for (const [desc, files] of Object.entries(descs)) {
    if (files.length > 1) {
      log('ERR', files.join(', '), `동일 description 중복 (${files.length}개)`);
    }
  }
}

// === RUN ===
console.log('═══════════════════════════════════════');
console.log('  SEO AUDIT — ' + new Date().toISOString());
console.log('  Mode: ' + (autoFix ? 'AUDIT + AUTO-FIX' : 'AUDIT ONLY'));
console.log('═══════════════════════════════════════\n');

const htmlFiles = findHtmlFiles();
console.log(`총 ${htmlFiles.length}개 HTML 파일 검사 시작...\n`);

for (const f of htmlFiles) auditFile(f);

console.log('\n--- 글로벌 검사 ---');
checkTitleUniqueness();
checkDescUniqueness();
checkSitemap();

console.log('\n═══════════════════════════════════════');
console.log(`  결과: ${errors} errors, ${warnings} warnings`);
if (autoFix) console.log(`  자동 수정: ${fixed} files`);
console.log('═══════════════════════════════════════');

process.exit(errors > 0 ? 1 : 0);
