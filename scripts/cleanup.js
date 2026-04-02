var fs = require('fs');
var venues = JSON.parse(fs.readFileSync('venues.json','utf8'));

// 1. Remove 쓰리노 venues
var before = venues.length;
venues = venues.filter(function(v) {
  var has = v.type.indexOf('쓰리노') >= 0 || (v.tags && v.tags.indexOf('쓰리노') >= 0);
  if (has) console.log('  DELETED: ' + v.region + v.name + ' (' + v.type + ')');
  return !has;
});
console.log('Removed ' + (before - venues.length) + ' 쓰리노 venues. Remaining: ' + venues.length);

// 2. Strip 가라오케, 비즈니스룸, 퍼블릭룸 from type
var STRIP = ['가라오케', '비즈니스룸', '퍼블릭룸'];
venues.forEach(function(v) {
  var orig = v.type;
  STRIP.forEach(function(w) {
    // Remove word and surrounding separators
    v.type = v.type.replace(new RegExp('\\s*·\\s*' + w, 'g'), '');
    v.type = v.type.replace(new RegExp(w + '\\s*·\\s*', 'g'), '');
    v.type = v.type.replace(new RegExp(w, 'g'), '');
  });
  v.type = v.type.replace(/^\s*·\s*|\s*·\s*$/g, '').replace(/\s*·\s*·\s*/g, ' · ').trim();
  if (v.tags) {
    v.tags = v.tags.filter(function(t) { return STRIP.indexOf(t) < 0; });
  }
  if (orig !== v.type) console.log('  TYPE: ' + v.region + v.name + ': "' + orig + '" → "' + v.type + '"');
});

fs.writeFileSync('venues.json', JSON.stringify(venues, null, 2), 'utf8');
console.log('venues.json updated.');
