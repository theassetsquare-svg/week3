var ce = require('./content-engine.js');
var venues = require('../venues.json');

venues.forEach(function(v, i) {
  v._fullName = v.region + v.name.replace(/\s*\(.*?\)/g,'').trim();
  if (v.name === '명월관') v._fullName = '일산명월관요정';
  var c = ce(v, i);
  var fn = v._fullName;
  var text = [c.summary, c.intro, c.story, c.quickPlan, c.faq, c.conclusion].join(' ');
  text = text.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  var fnEsc = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  text = text.replace(new RegExp(fnEsc, 'g'), ' ');
  var words = text.match(/[가-힣]{2,}/g) || [];
  var freq = {};
  words.forEach(function(w) { if (w.length >= 2) freq[w] = (freq[w]||0) + 1; });

  // Max frequency
  var max = 0;
  Object.keys(freq).forEach(function(w) { if (freq[w] > max) max = freq[w]; });

  // Words at each count (3~5)
  var at5 = Object.keys(freq).filter(function(w) { return freq[w] === 5; }).sort();
  var at4 = Object.keys(freq).filter(function(w) { return freq[w] === 4; }).sort();
  var at3 = Object.keys(freq).filter(function(w) { return freq[w] === 3; }).sort();
  var over5 = Object.keys(freq).filter(function(w) { return freq[w] > 5; });

  var line = '#' + (i+1) + ' ' + fn + ' (최대: ' + max + '회)';
  if (over5.length > 0) line += ' ⚠️ 초과: ' + over5.map(function(w){return w+'('+freq[w]+')';}).join(', ');
  line += '\n  5회: ' + (at5.length > 0 ? at5.join(', ') : '없음');
  line += '\n  4회: ' + (at4.length > 0 ? at4.join(', ') : '없음');
  console.log(line);
  console.log('');
});
