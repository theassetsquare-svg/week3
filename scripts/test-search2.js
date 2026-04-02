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
    fullName: normalize(item._fullName || (item.region + item.name)),
    full: normalize((item._fullName || '') + ' ' + item.name + ' ' + item.region + ' ' + item.type + ' ' + item.addr)
  };
});

function searchRanked(query) {
  if (!query) return listings;
  var q = normalize(query);
  var exact = [];
  var partial = [];
  searchIndex.forEach(function(entry) {
    if (entry.name === q || entry.region === q || entry.fullName === q) {
      exact.push(entry.item);
    } else if (entry.fullName.includes(q) || entry.name.includes(q) || entry.region.includes(q) || entry.type.includes(q)) {
      exact.push(entry.item);
    } else if (entry.full.includes(q)) {
      partial.push(entry.item);
    }
  });
  return exact.concat(partial);
}

// 이전에 안 됐던 검색어들 테스트
var tests = ['강남달토', '일산명월관', '부산고구려', '대구투데이', '강남', '달토', '명월관', '일산명월관요정', '유앤미'];
tests.forEach(function(q) {
  var results = searchRanked(q);
  console.log('"' + q + '" → ' + results.length + '건' + (results.length > 0 ? ' → ' + results.slice(0,3).map(function(r){ return r._fullName || (r.region+r.name); }).join(', ') : ' (검색결과 없음!)'));
});
