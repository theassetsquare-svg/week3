#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const DEPLOY = 'https://week3-2og.pages.dev';
const ROOT = path.join(__dirname, '..');

const urlMap = {
  'community/index.html': '/community/',
  'community/calculator.html': '/community/calculator.html',
  'community/fashion.html': '/community/fashion.html',
  'community/guidelines.html': '/community/guidelines.html',
  'community/tips.html': '/community/tips.html',
  'interactive/quiz.html': '/interactive/quiz.html',
  'interactive/safety.html': '/interactive/safety.html',
  'interactive/dresscode.html': '/interactive/dresscode.html',
  'events/index.html': '/events/',
  'magazine/index.html': '/magazine/',
  'map/index.html': '/map/',
  'ranking/index.html': '/ranking/',
};

let fixed = 0;
for (const [rel, urlPath] of Object.entries(urlMap)) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue;
  let html = fs.readFileSync(filePath, 'utf8');
  const fullUrl = DEPLOY + urlPath;
  
  // Fix canonical URL if it points to root
  if (html.includes('canonical" href="' + DEPLOY + '/"') || !html.includes('canonical')) {
    html = html.replace(/href="https:\/\/week3-2og\.pages\.dev\/"/g, 'href="' + fullUrl + '"');
  }
  
  // Fix og:url
  html = html.replace(
    /property="og:url" content="https:\/\/week3-2og\.pages\.dev\/"/,
    'property="og:url" content="' + fullUrl + '"'
  );
  
  // Fix JSON-LD url
  html = html.replace(
    /"url":"https:\/\/week3-2og\.pages\.dev\/"/,
    '"url":"' + fullUrl + '"'
  );
  
  fs.writeFileSync(filePath, html, 'utf8');
  fixed++;
}
console.log(`post-build-seo: ${fixed} pages URLs fixed`);
