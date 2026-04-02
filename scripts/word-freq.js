var ce = require('./content-engine.js');
var venues = require('../venues.json');

// Words to exclude from counting (functional words, particles, etc.)
var SKIP = new Set([
  "있다","없다","있는","없는","한다","된다","않는","않다","아닌","이다",
  "에서","으로","하는","되는","이는","것이","수도","때는","부터","까지",
  "그리고","하지만","또한","특히","다만","만약","하면","에는","에게","와의",
  "위해","통해","대한","함께","모두","모든","그런","이런","저런","어떤",
  "가장","정도","사이","이상","이하","이내","직접","미리","꼭","반드시",
  "가능","필요","확인","방문","이용","예약","전화","문의","안내","추천",
  "그대로","하기","때문","관련","경우","시간","사람","자리","분위기",
  "전국","디렉토리","전체","기본","일반","상세","정보","제공","운영",
  "좋은","좋다","많은","많다","높은","높다","크게","작은","새로","같은",
  "하고","하며","에서는","라면","라는","라도","에도","처럼","만큼"
]);

venues.forEach(function(v, i) {
  v._fullName = v.region + v.name.replace(/\s*\(.*?\)/g,'').trim();
  if (v.name === "명월관") v._fullName = "일산명월관요정";
  var c = ce(v, i);
  var fn = v._fullName;

  // Combine all content sections
  var text = [c.summary, c.intro, c.story, c.quickPlan, c.faq, c.conclusion].join(' ');
  text = text.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');

  // Remove fullName occurrences before counting (those are intentional)
  var fnEsc = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  text = text.replace(new RegExp(fnEsc, 'g'), ' ');

  // Extract Korean words (2+ chars)
  var words = text.match(/[가-힣]{2,}/g) || [];
  var freq = {};
  words.forEach(function(w) {
    if (w.length < 2 || SKIP.has(w)) return;
    freq[w] = (freq[w] || 0) + 1;
  });

  // Find words with count > 5
  var over = Object.keys(freq).filter(function(w) { return freq[w] > 5; });
  over.sort(function(a,b) { return freq[b] - freq[a]; });

  if (over.length > 0) {
    console.log('\n#' + (i+1) + ' ' + fn + ':');
    over.forEach(function(w) {
      console.log('  ' + w + ': ' + freq[w] + '회');
    });
  }
});
console.log('\n=== 스캔 완료 ===');
