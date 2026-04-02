var fs = require('fs');
var src = fs.readFileSync('/home/user/week3/main.js','utf8');

// 1. listings 파싱
var match = src.match(/const listings = (\[[\s\S]*?\n\]);/);
var listings = JSON.parse(match[1]);
console.log('listings 파싱 성공: ' + listings.length + '개');

// 2. _slug 확인
var noSlug = listings.filter(function(v) { return !v._slug; });
console.log('_slug 없는 venue: ' + noSlug.length + '개');

// 3. slug에 따옴표 포함 확인
var badQuote = listings.filter(function(v) {
  return v._slug.indexOf("'") >= 0 || v._slug.indexOf('"') >= 0;
});
console.log('slug에 따옴표: ' + badQuote.length + '개');

// 4. 특수문자 확인
listings.forEach(function(v) {
  if (/[^가-힣a-zA-Z0-9\-]/.test(v._slug)) {
    console.log('  특수문자 slug: ' + v._slug);
  }
});

// 5. DOM 요소 참조 확인
var domIds = ['grid','searchInput','searchDropdown','filters','listingCount','noResults'];
domIds.forEach(function(id) {
  if (src.indexOf('getElementById("' + id + '")') >= 0) {
    console.log('DOM #' + id + ': OK');
  } else {
    console.log('DOM #' + id + ': MISSING');
  }
});

// 6. JS syntax check
try {
  new Function(src);
  console.log('\nJS 문법: OK');
} catch(e) {
  console.log('\nJS 문법 ERROR: ' + e.message);
}
