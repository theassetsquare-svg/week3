var ce = require('./content-engine.js');
var venues = require('../venues.json');

venues.forEach(function(v, i) {
  v._fullName = v.region + v.name.replace(/\s*\(.*?\)/g,'').trim();
  if (v.name === '명월관') v._fullName = '일산명월관요정';
  var c = ce(v, i);
  var fn = v._fullName;
  var text = [c.summary, c.intro, c.story, c.quickPlan, c.faq, c.conclusion].join(' ');
  text = text.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  // Remove fullName
  var fnEsc = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  text = text.replace(new RegExp(fnEsc, 'g'), ' ');
  var words = text.match(/[가-힣]{2,}/g) || [];
  var freq = {};
  words.forEach(function(w) { if (w.length >= 2) freq[w] = (freq[w]||0) + 1; });
  var dupes = Object.keys(freq).filter(function(w) { return freq[w] >= 2; });
  dupes.sort(function(a,b) { return freq[b] - freq[a]; });
  console.log('#' + (i+1) + ' ' + fn);
  if (dupes.length === 0) { console.log('  (중복 없음)\n'); return; }
  dupes.forEach(function(w) { console.log('  ' + w + ': ' + freq[w] + '회'); });
  console.log('');
});
