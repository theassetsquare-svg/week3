var fs = require('fs');
var src = fs.readFileSync('/home/user/week3/main.js','utf8');

var match = src.match(/const listings = (\[[\s\S]*?\n\]);/);
var listings = JSON.parse(match[1]);

function normalize(str) {
  return str.replace(/\s+/g, '').toLowerCase();
}

var searchIndex = listings.map(function(item) {
  return {
    item: item,
    name: normalize(item.name),
    region: normalize(item.region),
    type: normalize(item.type),
    full: normalize(item.name + ' ' + item.region + ' ' + item.type)
  };
});

function searchRanked(query) {
  if (!query) return listings;
  var q = normalize(query);
  var exact = [];
  var partial = [];
  searchIndex.forEach(function(entry) {
    if (entry.name === q || entry.region === q) {
      exact.push(entry.item);
    } else if (entry.name.includes(q) || entry.region.includes(q) || entry.type.includes(q)) {
      exact.push(entry.item);
    } else if (entry.full.includes(q)) {
      partial.push(entry.item);
    }
  });
  return exact.concat(partial);
}

// Test searches
var tests = ['명월관', '달토', '고구려', '유앤미', '알리바바', '퀄리티', '한지민'];
tests.forEach(function(q) {
  var results = searchRanked(q).slice(0, 6);
  console.log('검색: "' + q + '" → ' + results.length + '건');
  results.forEach(function(r) {
    var url = '/v/' + encodeURI(r._slug) + '/';
    console.log('  ' + r.name + ' (' + r.region + ') → onclick="goDetail(\'' + r._slug + '\')" → ' + url);
  });
  console.log('');
});
