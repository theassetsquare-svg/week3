#!/usr/bin/env node
/**
 * cosine-sim.js — Raw cosine similarity checker for all detail pages
 * Extracts visible text, builds TF vectors, computes pairwise cosine similarity.
 * Reports all pairs > 10% and the max.
 */
const fs = require("fs");
const path = require("path");

const V_DIR = path.join(__dirname, "..", "v");
const dirs = fs.readdirSync(V_DIR).filter(d =>
  fs.statSync(path.join(V_DIR, d)).isDirectory()
);

// Extract visible text from HTML (strip tags, decode entities)
function extractText(html) {
  // Remove script, style, svg
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<svg[\s\S]*?<\/svg>/gi, "");
  // Remove HTML tags
  html = html.replace(/<[^>]+>/g, " ");
  // Decode entities
  html = html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  // Normalize whitespace
  return html.replace(/\s+/g, " ").trim();
}

// Tokenize Korean text into 2-gram characters (bigrams)
function tokenize(text) {
  // Remove punctuation, keep Korean and alphanumeric
  const clean = text.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = {};
  const words = clean.split(" ").filter(w => w.length >= 2);
  // Use word-level tokens
  for (const w of words) {
    tokens[w] = (tokens[w] || 0) + 1;
  }
  return tokens;
}

// Cosine similarity
function cosineSim(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, magA = 0, magB = 0;
  for (const k of keys) {
    const va = a[k] || 0;
    const vb = b[k] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Load all pages
const pages = [];
for (const d of dirs) {
  const fp = path.join(V_DIR, d, "index.html");
  if (!fs.existsSync(fp)) continue;
  const html = fs.readFileSync(fp, "utf-8");
  const text = extractText(html);
  const tokens = tokenize(text);
  pages.push({ slug: d, tokens, textLen: text.length });
}

console.log(`Loaded ${pages.length} detail pages\n`);

// Pairwise similarity
const violations = [];
let maxSim = 0, maxPair = "";
let totalPairs = 0;
let simSum = 0;

for (let i = 0; i < pages.length; i++) {
  for (let j = i + 1; j < pages.length; j++) {
    const sim = cosineSim(pages[i].tokens, pages[j].tokens);
    totalPairs++;
    simSum += sim;
    if (sim > maxSim) {
      maxSim = sim;
      maxPair = `${pages[i].slug} ↔ ${pages[j].slug}`;
    }
    if (sim > 0.10) {
      violations.push({ a: pages[i].slug, b: pages[j].slug, sim });
    }
  }
}

const avgSim = simSum / totalPairs;

console.log("=== RAW COSINE SIMILARITY REPORT ===");
console.log(`Total pairs checked: ${totalPairs}`);
console.log(`Average similarity: ${(avgSim * 100).toFixed(2)}%`);
console.log(`Max similarity: ${(maxSim * 100).toFixed(2)}% — ${maxPair}`);
console.log(`Violations (>10%): ${violations.length}\n`);

if (violations.length > 0) {
  // Sort by similarity descending
  violations.sort((a, b) => b.sim - a.sim);
  console.log("TOP VIOLATIONS:");
  for (const v of violations.slice(0, 30)) {
    console.log(`  ${(v.sim * 100).toFixed(2)}% — ${v.a} ↔ ${v.b}`);
  }
  if (violations.length > 30) {
    console.log(`  ... and ${violations.length - 30} more`);
  }
}

// Also check same-region similarity
const regionGroups = {};
for (const p of pages) {
  const region = p.slug.split("-").pop() || "unknown";
  if (!regionGroups[region]) regionGroups[region] = [];
  regionGroups[region].push(p);
}

console.log("\n=== SAME-REGION MAX SIMILARITY ===");
for (const [region, group] of Object.entries(regionGroups)) {
  if (group.length < 2) continue;
  let rMax = 0, rPair = "";
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const sim = cosineSim(group[i].tokens, group[j].tokens);
      if (sim > rMax) {
        rMax = sim;
        rPair = `${group[i].slug} ↔ ${group[j].slug}`;
      }
    }
  }
  const flag = rMax > 0.10 ? " ❌" : " ✅";
  console.log(`  ${region}: ${(rMax * 100).toFixed(2)}% — ${rPair}${flag}`);
}

process.exit(violations.length > 0 ? 1 : 0);
