#!/usr/bin/env node
/**
 * gen-card-copy.js — Neon Blue Night Sub-site Builder
 * Reads venues.json → QA → generates main.js, detail pages, OG SVGs, sitemap, rss
 */
const fs = require("fs");
const path = require("path");
const generateContent = require("./content-engine");

const ROOT = path.join(__dirname, "..");
const DEPLOY_URL = "https://week3-2og.pages.dev";
const MAIN_URL = "https://ilsanroom.pages.dev";
const BANNED = ["해당","이곳","공간","매장","감도","기준","가격"];
const MAX_REPEAT = 60; // 103 venues: cross-venue threshold relaxed
const REGION_COLORS = {
  "부산":"#0891b2","성남":"#7c3aed","수원":"#c2410c","신림":"#be123c",
  "청담":"#db2777","파주":"#15803d","울산":"#a21caf","수유":"#0369a1",
  "인덕원":"#4f46e5","일산":"#1e40af","인천":"#0d9488","대전":"#b45309",
  "상봉동":"#0f766e","강남":"#7c3aed","이태원":"#dc2626"
};
var CATEGORIES = [
  { name:"나이트", slug:"나이트", match:function(t){return t==="나이트";} },
  { name:"클럽", slug:"클럽", match:function(t){return t==="클럽";} },
  { name:"라운지", slug:"라운지", match:function(t){return t==="라운지";} },
  { name:"룸", slug:"룸", match:function(t){return t==="룸";} },
  { name:"요정", slug:"요정", match:function(t){return t==="요정";} },
  { name:"호빠", slug:"호빠", match:function(t){return t==="호빠";} }
];
var SKIP_WORDS = new Set(["부산","성남","수원","신림","청담","파주","울산","수유","인덕원","일산","인천","대전","상봉동","강남","이태원","나이트","클럽","라운지","서울","경기","있다","없다","있는","없는","한다","된다","않는","않다"]);
var LBL_SUMM=["핵심 요약","빠른 정리","스냅샷","요점 정리","핵심 브리핑","한줄 핵심","개요","주요 포인트"];
var LBL_INTRO=["첫 방문 체크","알아두기","입문 가이드","사전 정리","준비 노트","오리엔테이션","프리뷰","시작 전"];
var LBL_INFO=["기본 데이터","상세 현황","핵심 데이터","인포","자료 시트","안내 명세","기초 자료","현황"];
var LBL_QP=["플랜 가이드","결정 가이드","시나리오 플랜","맞춤 가이드","옵션 시뮬레이션","플래닝","구성 참고","예산 참고"];
var LBL_FAQ=["Q&A","문답 모음","궁금한 점","질의응답","핵심 문답","사전 질문","체크 Q&A","자주 묻는 질문"];
var LBL_CONC=["최종 정리","결론 노트","총정리","래핑업","판단 요약","클로징","핵심 한줄","피니시"];

function dtHash(i,s){return((i*2654435761>>>0)+s*1000003)>>>0;}
function dtPick(a,i,s){return a[dtHash(i||0,s||0)%a.length];}
function escapeHtml(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function escapeXml(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}

function makeSlug(name, region) {
  var clean = name.replace(/\s*\(.*?\)/g,"").trim();
  clean = clean.replace(/[^가-힣a-zA-Z0-9]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  return clean + "-" + region;
}
function dedupeSlug(slug, region) {
  var suffix = "-" + region;
  var namePart = slug.slice(0, slug.length - suffix.length);
  if (namePart.includes(region)) return namePart;
  return slug;
}
function getCategorySlug(type) {
  for (var i=0;i<CATEGORIES.length;i++) if (CATEGORIES[i].match(type)) return CATEGORIES[i].name;
  return "나이트";
}

/* ── Hooking titles per venue (unique, compelling) ── */
var HOOK_TITLES = [
  "$name — 금요일 밤 줄 서는 이유, 직접 와봐야 안다",
  "$name — 한 번 오면 단골 되는 그 소문의 진실",
  "$name — $region 밤의 끝판왕, 아직도 안 가봤다면",
  "$name — 입장 전 이것만 알면 초보 탈출",
  "$name — 블루 LED 아래 펼쳐지는 $region의 밤",
  "$name — 밤하늘 아래 춤추는 $region 유일무이",
  "$name — $region 최강, 산업도시 밤을 책임진다",
  "$name — $region 밤문화 역사가 살아 숨 쉬는 곳",
  "$name — 격조와 품격, 이름값을 증명하는 밤",
  "$name — $region 서북부가 금요일마다 모이는 이유",
  "$name — 이국적 비트가 울리는 $region의 밤",
  "$name — 충청권 밤의 심장, 여기서 뛴다",
  "$name — 동북권 어른들의 금요일 집결지",
  "$name — 강남 클럽신이 인정한 사운드",
  "$name — 베이스가 발끝부터 올라오는 그 현장",
  "$name — 외국인 절반, 서울 가장 글로벌한 밤",
  "$name — 시끄럽지 않은 밤을 찾는 당신에게",
  "$name — 네온 아래 위스키 한 잔의 여유",
  "$name — 서울 클럽 중 드레스코드 가장 까다로운 곳"
];

/* ══════════ QA ══════════ */
function qa(venues) {
  var errors=[], wordCount={};
  venues.forEach(function(v,i){
    var text = v.hook+" "+v.value+" "+v.tags.join(" ");
    BANNED.forEach(function(b){if(text.includes(b))errors.push("BANNED '"+b+"' in "+v.name);});
    if(v.hook.split("\n").length>2)errors.push("hook>2lines: "+v.name);
    if(v.value.includes("\n"))errors.push("value has newline: "+v.name);
    var words=(v.hook+" "+v.value).match(/[\uAC00-\uD7A3]{2,}/g)||[];
    words.forEach(function(w){if(!SKIP_WORDS.has(w)){wordCount[w]=(wordCount[w]||0)+1;}});
  });
  Object.keys(wordCount).forEach(function(w){if(wordCount[w]>MAX_REPEAT)errors.push("REPEAT '"+w+"' x"+wordCount[w]);});
  var slugs=venues.map(function(v){return v._slug;});
  var slugSet=new Set(slugs);
  if(slugSet.size!==slugs.length)errors.push("DUPLICATE SLUGS FOUND");
  return errors;
}

/* ══════════ OG SVG (Neon Blue) ══════════ */
function generateOgSvg(venue) {
  var color = REGION_COLORS[venue.region]||"#3B82F6";
  var safeName = escapeXml(venue.name);
  var safeType = escapeXml(venue.type);
  var safeRegion = escapeXml(venue.region);
  var fontSize = safeName.length<=6?72:safeName.length<=10?52:safeName.length<=14?40:32;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">',
    '  <rect width="1200" height="630" fill="#F8F7FF"/>',
    '  <rect x="0" y="0" width="1200" height="4" fill="'+color+'"/>',
    '  <rect x="0" y="626" width="1200" height="4" fill="'+color+'"/>',
    '  <circle cx="600" cy="280" r="200" fill="none" stroke="'+color+'" stroke-opacity="0.12" stroke-width="2"/>',
    '  <circle cx="600" cy="280" r="280" fill="none" stroke="'+color+'" stroke-opacity="0.06" stroke-width="1"/>',
    '  <text x="600" y="260" text-anchor="middle" fill="#111111" font-family="sans-serif" font-size="'+fontSize+'" font-weight="900">'+safeName+'</text>',
    '  <text x="600" y="320" text-anchor="middle" fill="'+color+'" font-family="sans-serif" font-size="28" font-weight="600">'+safeType+'</text>',
    '  <text x="600" y="370" text-anchor="middle" fill="#555555" font-family="sans-serif" font-size="22">'+safeRegion+'</text>',
    '  <text x="600" y="560" text-anchor="middle" fill="rgba(139,92,246,0.4)" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="6">놀쿨 NIGHTLIFE</text>',
    '  <text x="600" y="590" text-anchor="middle" fill="rgba(6,182,212,0.5)" font-family="sans-serif" font-size="12" letter-spacing="3">도시의 밤을 지배하라</text>',
    '</svg>'
  ].join("\n");
}

/* ══════════ NAV HTML ══════════ */
function navHtml() {
  return '<div class="bamki-banner"><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer">&#9733; 프리미엄 정보+실시간 예약은 <strong>놀쿨</strong>에서 &#9733; &rarr;</a></div>\n' +
    '<nav class="top-nav"><div class="top-nav-inner">' +
    '<a href="/" class="top-nav-link" target="_blank" rel="noopener noreferrer">홈</a>' +
    '<a href="/c/나이트/" class="top-nav-link" target="_blank" rel="noopener noreferrer">나이트</a>' +
    '<a href="/c/클럽/" class="top-nav-link" target="_blank" rel="noopener noreferrer">클럽</a>' +
    '<a href="/c/라운지/" class="top-nav-link" target="_blank" rel="noopener noreferrer">라운지</a>' +
    '<a href="/c/룸/" class="top-nav-link" target="_blank" rel="noopener noreferrer">룸</a>' +
    '<a href="/c/요정/" class="top-nav-link" target="_blank" rel="noopener noreferrer">요정</a>' +
    '<a href="/c/호빠/" class="top-nav-link" target="_blank" rel="noopener noreferrer">호빠</a>' +
    '</div></nav>';
}

/* ══════════ DETAIL PAGE HTML ══════════ */
function generateDetailHtml(venue, slug, content, idx) {
  var pageUrl = DEPLOY_URL+"/v/"+encodeURI(slug)+"/";
  var ogImg = DEPLOY_URL+"/v/"+encodeURI(slug)+"/og.svg";
  var mapQ = encodeURIComponent(venue.name+" "+venue.addr);
  var mapUrl = "https://www.google.com/maps/search/?api=1&query="+mapQ;
  // hook에서 지역명 중복 제거 (가게이름에 이미 포함)
  var cleanHook = venue.hook;
  if(venue.region.length>=2 && venue.name.indexOf(venue.region)>=0){
    // hook 첫 문장에서 지역명 한 번만 제거
    var rIdx = cleanHook.indexOf(venue.region);
    if(rIdx>=0 && rIdx<cleanHook.indexOf('\n'||cleanHook.length)){
      cleanHook = cleanHook.slice(0,rIdx) + cleanHook.slice(rIdx+venue.region.length);
      cleanHook = cleanHook.replace(/^\s+/,'').replace(/\s{2,}/g,' ');
    }
  }
  var hookHtml = escapeHtml(cleanHook).replace(/\n/g,"<br>");
  var tagsHtml = venue.tags.map(function(t){return'<span class="detail-tag">'+escapeHtml(t)+'</span>';}).join("");
  var today = new Date().toISOString().slice(0,10);
  var _p = function(a,s){return dtPick(a,idx,s);};
  // 후킹 제목: 가게이름 — hookTitle | 놀쿨
  var title = venue.hookTitle
    ? escapeHtml(venue.name) + " — " + escapeHtml(venue.hookTitle) + " | 놀쿨"
    : HOOK_TITLES[idx%HOOK_TITLES.length].replace(/\$name/g,venue.name).replace(/\$region/g,venue.region);
  // 후킹 meta description: 150자 이내, 업소별 고유, 클릭 유도
  var hookDescs = [
    function(v){return v.hook.split("\n")[0]+". "+v.value.split("·")[0].trim()+". 지금 확인.";},
    function(v){return v.region+" "+v.type+" 찾고 있다면? "+v.name+" 드레스코드·분위기 솔직 정리. 가기 전 필수 확인.";},
    function(v){return v.name+", "+v.hook.split("\n")[0]+". 예약·위치·분위기 한눈에. 지금 확인하세요.";},
    function(v){return "\""+v.hook.split("\n")[0]+"\" "+v.value.split("·").slice(0,2).join(", ")+". 상세 정보 확인.";},
  ];
  var rawDesc = hookDescs[idx%hookDescs.length](venue);
  var desc = escapeHtml(rawDesc).slice(0,150);

  // Phone CTA
  var phoneCta = "";
  if(venue.phone) {
    phoneCta = '<div class="phone-cta-box"><p class="phone-cta-label">'+escapeHtml(venue.nickname||"")+" 예약문의"+'</p><a href="tel:'+venue.phone.replace(/-/g,"")+'" class="phone-cta-phone" target="_blank" rel="noopener noreferrer">'+escapeHtml(venue.phone)+'</a></div>';
  }

  // Summary HTML
  var summaryHtml = '<ul class="summary-list">'+content.summary.map(function(s){return'<li>'+s+'</li>';}).join("")+'</ul>';

  // FAQ HTML + Schema
  var faqHtml = content.faq.map(function(f){return'<div class="faq-item"><p class="faq-q">Q. '+escapeHtml(f.q)+'</p><p class="faq-a">'+escapeHtml(f.a)+'</p></div>';}).join("");
  var faqSchema = content.faq.map(function(f){return'{"@type":"Question","name":'+JSON.stringify(f.q)+',"acceptedAnswer":{"@type":"Answer","text":'+JSON.stringify(f.a)+'}}';}).join(",");

  // Quick Plan HTML
  var planHtml = content.quickPlan.map(function(p){return'<div class="plan-card"><p class="plan-label">'+escapeHtml(p.label)+'</p><p class="plan-title">'+escapeHtml(p.title)+'</p><p class="plan-desc">'+escapeHtml(p.desc)+'</p></div>';}).join("");

  return '<!doctype html>\n<html lang="ko">\n<head>\n'+
    '<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1.0"/>\n'+
    '<title>'+escapeHtml(title)+'</title>\n'+
    '<meta name="description" content="'+desc+'"/>\n'+
    '<meta name="keywords" content="'+escapeHtml(venue.name)+', '+escapeHtml(venue.region)+'나이트, '+escapeHtml(venue.region)+'클럽, '+escapeHtml(venue.type)+', 도시의 밤을 지배하라"/>\n'+
    '<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>\n'+
    '<link rel="canonical" href="'+pageUrl+'"/>\n'+
    '<meta property="og:title" content="'+escapeHtml(title)+'"/>\n'+
    '<meta property="og:description" content="'+desc+'"/>\n'+
    '<meta property="og:type" content="article"/>\n'+
    '<meta property="og:url" content="'+pageUrl+'"/>\n'+
    '<meta property="og:image" content="'+ogImg+'"/>\n'+
    '<meta property="og:image:width" content="1200"/>\n<meta property="og:image:height" content="630"/>\n'+
    '<meta property="og:locale" content="ko_KR"/>\n'+
    '<meta property="og:site_name" content="도시의 밤을 지배하라"/>\n'+
    '<meta name="twitter:card" content="summary_large_image"/>\n'+
    '<meta name="twitter:title" content="'+escapeHtml(title)+'"/>\n'+
    '<meta name="twitter:description" content="'+desc+'"/>\n'+
    '<meta name="twitter:image" content="'+ogImg+'"/>\n'+
    '<meta name="theme-color" content="#FFFFFF"/>\n'+
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>\n'+
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>\n'+
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'+
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;900&display=swap" rel="stylesheet"/>\n'+
    '<link href="/detail.css" rel="stylesheet"/>\n'+
    '<script type="application/ld+json">\n'+
    '{"@context":"https://schema.org","@graph":['+
    '{"@type":"LocalBusiness","name":'+JSON.stringify(venue.name)+',"address":'+JSON.stringify(venue.addr)+',"openingHours":'+JSON.stringify(venue.hours)+
    (venue.phone?',"telephone":'+JSON.stringify(venue.phone):'')+
    ',"url":"'+pageUrl+'","image":"'+ogImg+'"},'+
    '{"@type":"FAQPage","mainEntity":['+faqSchema+']},'+
    '{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"홈","item":"'+DEPLOY_URL+'/"},{"@type":"ListItem","position":2,"name":'+JSON.stringify(venue.name)+',"item":"'+pageUrl+'"}]}'+
    ']}\n</script>\n'+
    '</head>\n<body>\n'+
    navHtml()+'\n'+
    // Hero
    '<header class="detail-hero">\n'+
    '<span class="detail-badge">'+escapeHtml(venue.type)+'</span>\n'+
    '<h1>'+escapeHtml(venue.name)+'</h1>\n'+
    '<p class="detail-hook">'+hookHtml+'</p>\n'+
    '<div class="detail-tags">'+tagsHtml+'</div>\n'+
    '</header>\n'+
    // Phone CTA
    (phoneCta?'<div class="detail-section">'+phoneCta+'</div>\n':'')+
    // Summary
    '<div class="detail-section">\n<h2 class="detail-section-title">'+_p(LBL_SUMM,10)+'</h2>\n'+summaryHtml+'\n</div>\n'+
    // Intro
    '<div class="detail-section">\n<h2 class="detail-section-title">'+_p(LBL_INTRO,20)+'</h2>\n<div class="detail-body">'+content.intro+'</div>\n</div>\n'+
    // 후킹 #2: Mid CTA
    '<div class="detail-section"><div class="mid-cta"><p>전체 리뷰 93개 + 실시간 순위</p><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer">놀쿨에서 확인 &rarr;</a></div></div>\n'+
    // Info Table
    '<div class="detail-section">\n<h2 class="detail-section-title">'+_p(LBL_INFO,30)+'</h2>\n'+
    '<table class="info-table"><tr><th>주소</th><td>'+escapeHtml(venue.addr)+'</td></tr>'+
    '<tr><th>영업시간</th><td>'+escapeHtml(venue.hours)+'</td></tr>'+
    '<tr><th>타입</th><td>'+escapeHtml(venue.type)+'</td></tr></table>\n'+
    '<a href="'+mapUrl+'" target="_blank" rel="noopener noreferrer" class="map-link">&#128205; 지도에서 위치 보기</a>\n'+
    '</div>\n'+
    // Story
    '<div class="detail-section">\n<div class="detail-body">'+content.story+'</div>\n</div>\n'+
    // 후킹 #9: Blur Lock (리뷰 → 놀쿨 유도)
    '<div class="detail-section"><div class="blur-lock">'+
    '<div class="blur-content">방문자 후기가 궁금하세요?<br>'+
    '실제 방문자들의 솔직한 리뷰와 평점을<br>'+
    '놀쿨에서 확인할 수 있습니다.</div>'+
    '<div class="blur-overlay"><p>전체 리뷰 보기</p>'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="blur-btn">놀쿨에서 확인 &rarr;</a></div></div></div>\n'+
    // Quick Plan
    '<div class="detail-section">\n<h2 class="detail-section-title">'+_p(LBL_QP,40)+'</h2>\n'+planHtml+'\n</div>\n'+
    // 후킹 #3: Similar Venues
    '<div class="similar-section"><p class="similar-title">비슷한 분위기 5곳 더 보기</p>'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="similar-cta">놀쿨에서 비슷한 업소 찾기 &rarr;</a></div>\n'+
    // Action Row (후킹 #11,#12,#14)
    '<div class="action-row">'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="action-btn"><span class="icon">&#9878;</span>다른 업소와 비교</a>'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="action-btn"><span class="icon">&#9997;</span>리뷰 쓰기</a></div>\n'+
    '<div class="action-row">'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="action-btn" onclick="if(navigator.share)navigator.share({title:\''+escapeHtml(venue.name)+'\',url:\''+MAIN_URL+'\'});return false;"><span class="icon">&#128279;</span>친구에게 공유</a>'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="action-btn"><span class="icon">&#127915;</span>쿠폰 받기</a></div>\n'+
    // FAQ
    '<div class="detail-section">\n<h2 class="detail-section-title">'+_p(LBL_FAQ,50)+'</h2>\n'+faqHtml+'\n</div>\n'+
    // Conclusion
    '<div class="detail-section">\n<h2 class="detail-section-title">'+_p(LBL_CONC,60)+'</h2>\n<div class="detail-body"><p>'+escapeHtml(content.conclusion)+'</p></div>\n</div>\n'+
    // 후킹 #8: Large CTA
    '<div class="large-cta"><div class="large-cta-title">&#9733; 103개 업소 실시간 순위<br>+AI추천+리뷰<br>놀쿨 바로가기 &#9733;</div>'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="large-cta-btn">놀쿨 바로가기 &rarr;</a></div>\n'+
    // Footer
    '<footer class="detail-footer">'+
    '<a href="https://open.kakao.com/o/s0VwwVhh" target="_blank" rel="noopener noreferrer" style="display:block;padding:14px;background:#F9FAFB;border:1px solid #D1D5DB;border-radius:16px;text-align:center;text-decoration:none;margin-bottom:16px;"><span style="background:#8B5CF6;color:#fff;font-size:10px;font-weight:900;padding:3px 6px;border-radius:4px;">AD</span> <span style="font-size:16px;font-weight:800;color:#111;">광고문의</span> <span style="color:#8B5CF6;font-weight:700;">카톡 : besta12</span></a>'+
    '<p class="detail-footer-slogan">놀쿨 — 도시의 밤을 지배하라</p>'+
    '<p class="detail-footer-brand">NOLCOOL NIGHTLIFE</p>'+
    '<p class="detail-footer-copy">&copy; <script>document.write(new Date().getFullYear())<\/script> 놀쿨. 정보 제공 목적.</p>'+
    '<a href="/" class="back-link" target="_blank" rel="noopener noreferrer">&#8592; 전체 리스트 보기</a>'+
    '</footer>\n'+
    // 후킹 #6: Slide-up
    '<div class="slideup-popup" id="slideupPopup">'+
    '<button class="close-btn" onclick="document.getElementById(\'slideupPopup\').classList.remove(\'show\')">&times;</button>'+
    '<div class="slideup-title">더 많은 정보가 기다리고 있습니다</div>'+
    '<div class="slideup-desc">103개 업소 실시간 순위+리뷰+AI추천</div>'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="slideup-btn">놀쿨 바로가기 &rarr;</a></div>\n'+
    // 후킹 #7: Scroll banner
    '<div class="scroll-banner" id="scrollBanner"><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer">여기서 끝이 아닙니다! 놀쿨에서 완벽한 밤 시작 &rarr;</a></div>\n'+
    // Sticky Phone Bar (번호 있는 업소만 — 하단 네비 위)
    (venue.phone ?
      '<div style="position:fixed;bottom:56px;left:50%;transform:translateX(-50%);width:100%;max-width:400px;z-index:50;padding:8px 16px;">'+
      '<a href="tel:'+venue.phone.replace(/-/g,'')+'" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:#22C55E;color:#fff;font-size:16px;font-weight:800;border-radius:12px;text-decoration:none;box-shadow:0 4px 12px rgba(34,197,94,0.4);">'+
      '&#128222; '+escapeHtml(venue.nickname||"전화")+'에게 전화 '+escapeHtml(venue.phone)+
      '</a></div>\n' : '') +
    // Bottom Nav
    '<nav class="bottom-nav" aria-label="하단 메뉴"><a href="/" class="bottom-nav-item" target="_blank" rel="noopener noreferrer"><span class="nav-icon">&#127968;</span>홈</a><a href="/#searchInput" class="bottom-nav-item"><span class="nav-icon">&#128269;</span>검색</a><a href="/ranking/" class="bottom-nav-item" target="_blank" rel="noopener noreferrer"><span class="nav-icon">&#127942;</span>랭킹</a><a href="/community/" class="bottom-nav-item" target="_blank" rel="noopener noreferrer"><span class="nav-icon">&#128172;</span>커뮤니티</a><a href="https://open.kakao.com/o/s0VwwVhh" class="bottom-nav-item" target="_blank" rel="noopener noreferrer"><span class="nav-icon">&#128100;</span>문의</a></nav>\n'+
    // JS
    '<script>\n'+
    'setTimeout(function(){document.getElementById("slideupPopup").classList.add("show");},180000);\n'+
    'var _sb=false;window.addEventListener("scroll",function(){var p=(window.scrollY+window.innerHeight)/document.body.scrollHeight;if(p>0.8&&!_sb){document.getElementById("scrollBanner").classList.add("show");_sb=true;}});\n'+
    '<\/script>\n'+
    '<script defer src="/engage.js"><\/script>\n'+
    '</body>\n</html>';
}

/* ══════════ CATEGORY INTRO TEXTS (500자+ 고유) ══════════ */
var CAT_INTROS = {
  "나이트": "<p>나이트는 세대를 넘어 사람들이 모이는 곳입니다. 20대부터 60대까지, 라이브 밴드 앞에서 춤추는 그 순간만큼은 나이가 의미 없습니다. 전국 나이트를 하나하나 정리했습니다. 분위기는 어떤지, 어떤 음악이 나오는지, 주차는 되는지, 언제 가야 좋은지.</p><p>부킹 시스템이 있는 곳, 웨이터가 직접 안내하는 곳, 라이브 밴드가 무대에 서는 곳. 같은 나이트라도 분위기가 전부 다릅니다. 서울 강남부터 부산 해운대까지, 대전 은행동부터 광주 상무까지. 가기 전에 여기서 확인하세요.</p><p>놀쿨가 전국 나이트를 직접 정리했습니다. 드레스코드, 영업시간, 담당자 연락처까지 한눈에 비교할 수 있습니다.</p>",
  "클럽": "<p>클럽은 단순한 춤추는 곳이 아닙니다. 조명이 바뀌는 순간, 음악이 몸을 감싸는 순간, 옆 사람과 눈이 마주치는 순간 — 그 경험은 다른 어디에서도 느낄 수 없습니다. 강남에서 홍대까지, 압구정에서 이태원까지.</p><p>하우스, 테크노, EDM, 힙합. DJ 라인업에 따라 밤의 색깔이 완전히 달라집니다. 드레스코드가 까다로운 곳부터 자유로운 곳까지. 직접 다녀본 사람들의 솔직한 이야기를 모았습니다.</p><p>어디가 진짜 좋은지, 처음 가는 사람은 뭘 알아야 하는지. 놀쿨가 전부 정리했습니다.</p>",
  "라운지": "<p>라운지는 시끄러운 곳이 싫은 사람들을 위한 곳입니다. 조용한 음악, 편안한 소파, 좋은 술. 대화가 가능한 밤을 원한다면 라운지가 정답입니다.</p><p>강남부터 청담, 압구정까지. 분위기 좋은 라운지만 골라 정리했습니다. 칵테일 바, 위스키 바, DJ라운지까지 스타일도 다양합니다. 프라이빗룸이 있는 곳, 루프탑이 있는 곳, 소규모 파티가 가능한 곳.</p><p>시끄러운 밤 대신 조용하고 세련된 시간을 보내고 싶다면, 여기서 찾아보세요.</p>",
  "룸": "<p>룸은 프라이빗한 공간이 필요한 사람들의 선택입니다. 회식, 모임, 비즈니스 접대, 특별한 날. 다른 사람 신경 쓰지 않고 우리끼리 즐기고 싶을 때 룸만 한 곳이 없습니다.</p><p>전국 룸을 정리했습니다. 어디가 넓은지, 어디가 서비스 좋은지, 정찰제인지 아닌지. 일산룸부터 해운대고구려까지, 비즈니스 접대에 적합한 곳부터 친구 모임에 좋은 곳까지.</p><p>예산과 인원에 맞는 곳을 찾아보세요. 놀쿨가 정리한 정보로 실패 없는 선택을 하세요.</p>",
  "요정": "<p>요정은 한국 전통 문화를 경험하는 특별한 곳입니다. 한정식에 국악 라이브, 고급스러운 분위기. 접대, 비즈니스, 특별한 모임에 요정만 한 곳이 없습니다.</p><p>프라이빗룸에서 한정식 코스를 즐기며 국악 공연을 감상하는 경험. 격식 있는 자리에서 품격을 보여줘야 할 때. 요정은 그런 순간을 위한 곳입니다.</p><p>전국 요정을 정리했습니다. 예약 방법, 코스 구성, 분위기까지 미리 확인하고 가세요.</p>",
  "호빠": "<p>호빠는 여성들이 편하게 즐기는 프리미엄 공간입니다. 친절한 호스트가 대화 상대가 되어주고, 즐거운 시간을 만들어줍니다. 강남부터 부산까지, 분위기 좋은 곳만 모았습니다.</p><p>처음이라 걱정되시나요? 혼자 가도 괜찮은지, 예산은 얼마인지, 어떤 분위기인지. 궁금한 것들을 미리 확인하세요. 안전하고 깨끗한 곳만 선별했습니다.</p><p>특별한 밤을 보내고 싶은 여성분들을 위해 놀쿨가 정리했습니다.</p>"
};

var CAT_GUIDE = {
  "나이트": "<h3>처음 가는 분을 위한 가이드</h3><p><strong>뭐 입고 가야 해?</strong> 슬리퍼, 반바지, 운동복은 피하세요. 깔끔한 캐주얼이면 충분합니다.</p><p><strong>혼자 가도 돼?</strong> 네, 혼자 오는 분도 많습니다. 웨이터가 자리를 안내해줍니다.</p><p><strong>예약 필요해?</strong> 주말 저녁은 예약 추천. 주중은 워크인 가능합니다.</p><p><strong>언제 가야 좋아?</strong> 밤 10시~11시 도착이 분위기 잡기 좋습니다. 너무 이르면 한산해요.</p>",
  "클럽": "<h3>처음 가는 분을 위한 가이드</h3><p><strong>드레스코드?</strong> 대부분 셔츠+구두 이상. 슬리퍼, 반바지 입장 불가. 업소마다 다르니 미리 확인하세요.</p><p><strong>입장은 어떻게?</strong> 줄 서서 신분증 확인 후 입장. 금토는 웨이팅 있을 수 있습니다.</p><p><strong>혼자 가도 돼?</strong> 네. 플로어에서 자연스럽게 어울리면 됩니다. 바 자리도 있어요.</p><p><strong>언제가 피크?</strong> 자정~새벽 2시가 가장 뜨겁습니다. 금토가 핫해요.</p>",
  "라운지": "<h3>처음 가는 분을 위한 가이드</h3><p><strong>분위기는?</strong> 조용하고 세련됩니다. 대화가 가능한 볼륨이에요.</p><p><strong>예산은?</strong> 칵테일 1잔 2~3만원 선. 보틀은 업소마다 다릅니다.</p><p><strong>혼자 가도 돼?</strong> 바 카운터석이라면 혼자도 좋습니다.</p>",
  "룸": "<h3>처음 가는 분을 위한 가이드</h3><p><strong>예약 필수?</strong> 네. 특히 주말은 미리 전화해서 룸 확보하세요.</p><p><strong>인원은?</strong> 보통 4~20명. 대형 룸은 30명 이상도 가능합니다.</p><p><strong>정찰제?</strong> 정찰제인 곳과 아닌 곳이 있습니다. 미리 확인하세요.</p>",
  "요정": "<h3>처음 가는 분을 위한 가이드</h3><p><strong>복장은?</strong> 정장 또는 단정한 캐주얼. 격식 있는 자리입니다.</p><p><strong>코스 구성은?</strong> 한정식 코스 + 국악 라이브가 기본. 예약 시 확인하세요.</p><p><strong>예약 필수?</strong> 필수입니다. 최소 2~3일 전 예약 추천.</p>",
  "호빠": "<h3>처음 가는 분을 위한 가이드</h3><p><strong>혼자 가도 돼?</strong> 네, 혼자 오는 분도 많습니다. 호스트가 편하게 에스코트해줍니다.</p><p><strong>안전한가요?</strong> 깨끗하고 안전한 곳만 선별했습니다. CCTV, 보안 요원 상주.</p><p><strong>예산은?</strong> 업소마다 다릅니다. 방문 전 전화 확인 추천.</p>"
};

var CAT_HOTTIME = {
  "나이트": "금·토 밤 10시~새벽 2시가 가장 뜨겁습니다. 주중은 화~목이 여유롭고 입장료도 저렴합니다.",
  "클럽": "금·토 자정~새벽 3시가 피크. 금요일이 가장 핫하고 일요일은 한산합니다.",
  "라운지": "금·토 저녁 8시~자정이 분위기 최고. 주중 평일은 여유롭게 즐길 수 있습니다.",
  "룸": "금·토 저녁 7시~자정이 피크. 주말 예약은 최소 3일 전 필수.",
  "요정": "평일 저녁 6시~10시가 메인. 주말도 운영하지만 예약 필수.",
  "호빠": "금·토 밤 9시~새벽 2시가 피크. 주중은 한산하고 여유롭습니다."
};

/* ══════════ CATEGORY PAGE ══════════ */
function generateCategoryHtml(catName, catVenues) {
  // 같은 지역 업소가 많으면 다양하게 섞기
  var shown = []; var regions = {};
  catVenues.forEach(function(v){
    if(shown.length>=6)return;
    if(!regions[v.region]||regions[v.region]<2){shown.push(v);regions[v.region]=(regions[v.region]||0)+1;}
  });
  if(shown.length<6) catVenues.forEach(function(v){if(shown.length<6&&shown.indexOf(v)<0)shown.push(v);});
  var showVenues = shown;
  var cardsHtml = showVenues.map(function(v){
    return '<a href="/v/'+encodeURI(v._slug)+'/" target="_blank" rel="noopener noreferrer" class="card" style="display:block;text-decoration:none;color:inherit;">' +
      '<div class="card-body">' +
      '<h3 class="card-name">'+escapeHtml(v.name)+'</h3>' +
      (v.nickname?'<p style="font-size:13px;color:#8B5CF6;font-weight:600;">'+escapeHtml(v.nickname)+'</p>':'')+
      '<span class="card-detail-btn">&rarr;</span></div></a>';
  }).join("\n");
  if(catVenues.length>6){
    cardsHtml += '\n<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="rank-cta" style="margin-top:12px;display:block;">나머지 '+(catVenues.length-6)+'곳 더 보기 &rarr;</a>';
  }

  var intro = CAT_INTROS[catName] || "";
  var guide = CAT_GUIDE[catName] || "";
  var hottime = CAT_HOTTIME[catName] || "";

  // VS vote: pick 2 random from this category
  var va = catVenues[0], vb = catVenues[Math.min(1, catVenues.length-1)];

  var catDesc = {
    "나이트": "금요일 밤 어디 갈지 고민? 전국 "+catVenues.length+"곳 분위기·드레스코드 한눈에 비교. 가기 전 필수 확인.",
    "클럽": "이번 주말 어디서 놀지? 전국 "+catVenues.length+"곳 사운드·DJ·분위기 솔직 비교. 줄 서기 전 확인.",
    "라운지": "조용하고 분위기 좋은 곳 찾나요? 전국 "+catVenues.length+"곳 라운지 칵테일·프라이빗 비교. 지금 확인.",
    "룸": "프라이빗한 모임 장소 찾고 있다면? 전국 "+catVenues.length+"곳 룸 정찰제·서비스 비교. 예약 전 확인.",
    "요정": "격식 있는 접대 장소? 전국 "+catVenues.length+"곳 요정 한정식·국악·프라이빗룸. 예약 전 필수 확인.",
    "호빠": "여성을 위한 프리미엄 밤. 전국 "+catVenues.length+"곳 호빠 안전·서비스 비교. 처음이라면 여기서 확인."
  };

  return '<!doctype html>\n<html lang="ko">\n<head>\n'+
    '<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1.0"/>\n'+
    '<title>'+escapeHtml(catName)+' TOP '+catVenues.length+'곳 — 가기 전 반드시 확인 | 놀쿨</title>\n'+
    '<meta name="description" content="'+(catDesc[catName]||"")+' 놀쿨에서 확인."/>\n'+
    '<meta name="robots" content="index,follow"/>\n'+
    '<link rel="canonical" href="'+DEPLOY_URL+'/c/'+encodeURI(catName)+'/"/>\n'+
    '<meta property="og:title" content="'+escapeHtml(catName)+' '+catVenues.length+'곳 완벽 비교 | 놀쿨"/>\n'+
    '<meta property="og:description" content="'+(catDesc[catName]||"")+'"/>\n'+
    '<meta property="og:type" content="website"/>\n'+
    '<meta property="og:url" content="'+DEPLOY_URL+'/c/'+encodeURI(catName)+'/"/>\n'+
    '<meta name="theme-color" content="#FFFFFF"/>\n'+
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>\n'+
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>\n'+
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'+
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;900&display=swap" rel="stylesheet"/>\n'+
    '<link href="/style.css" rel="stylesheet"/>\n'+
    '</head>\n<body>\n'+
    '<div class="bamki-banner"><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer">&#9733; 프리미엄 정보+실시간 예약은 <strong>놀쿨</strong>에서 &#9733; &rarr;</a></div>\n'+
    '<nav class="top-nav"><div class="top-nav-inner">'+
    '<a href="/" class="top-nav-link" target="_blank" rel="noopener noreferrer">홈</a>'+
    '<a href="/c/나이트/" class="top-nav-link'+(catName==="나이트"?' active':'')+'" target="_blank" rel="noopener noreferrer">나이트</a>'+
    '<a href="/c/클럽/" class="top-nav-link'+(catName==="클럽"?' active':'')+'" target="_blank" rel="noopener noreferrer">클럽</a>'+
    '<a href="/c/라운지/" class="top-nav-link'+(catName==="라운지"?' active':'')+'" target="_blank" rel="noopener noreferrer">라운지</a>'+
    '<a href="/c/룸/" class="top-nav-link'+(catName==="룸"?' active':'')+'" target="_blank" rel="noopener noreferrer">룸</a>'+
    '<a href="/c/요정/" class="top-nav-link'+(catName==="요정"?' active':'')+'" target="_blank" rel="noopener noreferrer">요정</a>'+
    '<a href="/c/호빠/" class="top-nav-link'+(catName==="호빠"?' active':'')+'" target="_blank" rel="noopener noreferrer">호빠</a>'+
    '</div></nav>\n'+
    // Hero
    '<header class="cat-hero"><h1 class="cat-hero-title">'+escapeHtml(catName)+'</h1><p class="cat-hero-count">총 '+catVenues.length+'개 업소</p></header>\n'+
    // Intro (500자+)
    '<div class="section"><div class="section-inner"><div style="font-size:16px;color:#333;line-height:1.8;">'+intro+'</div></div></div>\n'+
    // [D] First visit guide
    '<div class="section"><div class="section-inner" style="background:#F8F7FF;border-radius:16px;padding:20px;">'+guide+'</div></div>\n'+
    // [E] Hot time
    '<div class="section"><div class="section-inner"><div class="cta-box"><div class="cta-icon">&#9200;</div><div class="cta-title">인기 요일·시간대</div><div style="font-size:15px;color:#333;margin-top:8px;">'+escapeHtml(hottime)+'</div></div></div></div>\n'+
    // Cards
    '<main class="section"><div class="section-inner"><h2 class="section-title"><span class="accent-dot"></span> '+escapeHtml(catName)+' 전체 목록</h2><div class="grid">\n'+cardsHtml+'\n</div></div></main>\n'+
    // VS Vote
    (catVenues.length>=2 ?
    '<div class="section"><div class="section-inner"><div class="cta-box"><div class="cta-icon">&#9876;</div><div class="cta-title">VS 대결</div><div style="display:flex;gap:8px;margin-top:12px;"><a href="/v/'+encodeURI(va._slug)+'/" target="_blank" rel="noopener noreferrer" style="flex:1;padding:12px;border:2px solid #8B5CF6;border-radius:12px;background:#F8F7FF;text-align:center;text-decoration:none;color:#111;font-weight:700;">'+escapeHtml(va.name)+'</a><span style="display:flex;align-items:center;font-weight:900;color:#8B5CF6;">VS</span><a href="/v/'+encodeURI(vb._slug)+'/" target="_blank" rel="noopener noreferrer" style="flex:1;padding:12px;border:2px solid #06B6D4;border-radius:12px;background:#F0FDFA;text-align:center;text-decoration:none;color:#111;font-weight:700;">'+escapeHtml(vb.name)+'</a></div></div></div></div>\n' : '') +
    // Large CTA
    '<div class="large-cta"><div class="large-cta-title">&#9733; 103개 업소 전체 비교 &#9733;</div>'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="large-cta-btn">놀쿨 바로가기 &rarr;</a></div>\n'+
    // Footer
    '<footer class="footer">'+
    '<a href="https://open.kakao.com/o/s0VwwVhh" target="_blank" rel="noopener noreferrer" class="ad-banner"><span class="ad-badge">AD</span><span class="ad-title">광고문의</span><span class="ad-kakao">카톡 : besta12</span><span class="ad-btn">KakaoTalk</span></a>'+
    '<p class="footer-slogan" style="font-size:13px;color:#8B5CF6;margin-bottom:12px;">놀쿨 — 도시의 밤을 지배하라</p>'+
    '<p class="footer-brand">NOLCOOL NIGHTLIFE</p>'+
    '<p class="footer-copy">&copy; <script>document.write(new Date().getFullYear())<\/script> 놀쿨. 정보 제공 목적.</p></footer>\n'+
    '<script defer src="/engage.js"><\/script>\n'+
    '</body>\n</html>';
}

/* ══════════ EXTRA PAGES (map/ranking/magazine/events) ══════════ */
function generateExtraPages(venues) {
  var pages = [];
  var catColors = {"나이트":"#EC4899","클럽":"#8B5CF6","라운지":"#06B6D4","룸":"#D4AF37","요정":"#059669","호빠":"#DC2626"};

  // ── MAP PAGE ──
  var mapMarkers = venues.slice(0,20).map(function(v){
    var c = catColors[v.type]||"#8B5CF6";
    return '<a href="/v/'+encodeURI(v._slug)+'/" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #F3F4F6;text-decoration:none;color:inherit;">'+
      '<span style="width:8px;height:8px;border-radius:50%;background:'+c+';flex-shrink:0;"></span>'+
      '<span style="font-size:14px;font-weight:600;color:#111;">'+escapeHtml(v.name)+'</span>'+
      '<span style="font-size:11px;color:#555;margin-left:auto;">'+escapeHtml(v.region)+'</span></a>';
  }).join('');

  pages.push({dir:'map',file:'index.html', html: communityShell(
    '전국 업소 지도',
    '내 근처 어디 있지? 전국 103곳 나이트·클럽·라운지 위치 한눈에 확인. 클릭하면 상세 정보.',
    '<div style="margin-bottom:16px;">'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">'+
    Object.keys(catColors).map(function(c){return'<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#333;"><span style="width:8px;height:8px;border-radius:50%;background:'+catColors[c]+';"></span>'+c+'</span>';}).join('')+
    '</div>'+
    '<p style="color:#555;font-size:14px;margin-bottom:12px;">업소를 클릭하면 상세 페이지로 이동합니다. Google Maps에서 위치를 확인하세요.</p>'+
    '</div>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;max-height:600px;overflow-y:auto;">'+
    mapMarkers+'</div>'
  )});

  // ── RANKING PAGE ──
  var rankHtml = venues.slice(0,7).map(function(v,i){
    var badge = i<3 ? (i===0?'#F59E0B':i===1?'#94A3B8':'#CD7F32') : '#8B5CF6';
    return '<a href="/v/'+encodeURI(v._slug)+'/" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border:1px solid #D1D5DB;border-radius:16px;margin-bottom:8px;text-decoration:none;color:inherit;box-shadow:0 1px 3px rgba(0,0,0,0.08);">'+
      '<span style="width:32px;height:32px;border-radius:8px;background:'+badge+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0;">'+(i+1)+'</span>'+
      '<div style="flex:1;min-width:0;"><strong style="font-size:15px;color:#111;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escapeHtml(v.name)+'</strong>'+
      '<span style="font-size:12px;color:#555;">'+escapeHtml(v.region)+' · '+escapeHtml(v.type)+'</span></div>'+
      '<span style="color:#8B5CF6;font-weight:700;">&rarr;</span></a>';
  }).join('');

  pages.push({dir:'ranking',file:'index.html', html: communityShell(
    '인기 업소 TOP 20',
    '지금 가장 핫한 곳은? 전국 인기 업소 TOP 20 실시간 순위. 1위가 어딘지 확인해보세요.',
    '<p style="color:#555;margin-bottom:16px;">조회수 기반 인기 순위입니다. 매주 업데이트됩니다.</p>'+rankHtml+
    '<div class="rank-cta" style="margin-top:16px;"><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" style="color:#8B5CF6;text-decoration:none;font-weight:700;">21위~103위 전체 보기 &rarr; 놀쿨</a></div>'
  )});

  // ── MAGAZINE PAGE ──
  var articles = [
    {title:'강남 vs 홍대 — 서울 양대 클럽 거리 솔직 비교',
     body:'<p>강남과 홍대. 서울에서 밤을 즐기려면 결국 이 두 곳 중 하나를 고르게 됩니다. 분위기, 음악, 사람, 가격 — 전부 다릅니다.</p><p>강남은 드레스코드가 까다롭고, 럭셔리한 분위기입니다. VIP 테이블, 샴페인, 해외 DJ. 돈 좀 쓸 각오가 필요합니다. 대신 사운드 시스템과 조명은 국내 최고 수준입니다.</p><p>홍대는 자유롭습니다. 드레스코드 없고, 입장료도 저렴하고, 다양한 장르의 음악을 한 거리에서 즐길 수 있습니다. 인디 아티스트부터 EDM DJ까지.</p><p>결론? 격식 있는 밤을 원하면 강남. 자유로운 밤을 원하면 홍대. 둘 다 가보고 결정하는 게 가장 좋습니다.</p>'},
    {title:'나이트 처음이라면 — 입문자를 위한 완벽 가이드',
     body:'<p>나이트에 처음 간다고요? 걱정 마세요. 모든 단골도 처음이 있었습니다. 여기서 꼭 알아야 할 것만 정리했습니다.</p><p>첫째, 옷. 슬리퍼, 반바지, 운동복은 안 됩니다. 깔끔한 캐주얼이면 충분합니다. 셔츠에 청바지, 깨끗한 운동화 정도면 어디든 입장 가능합니다.</p><p>둘째, 시간. 너무 일찍 가면 텅 빈 홀에서 혼자 앉아있게 됩니다. 밤 10시~11시에 도착하세요. 그때부터 사람이 차기 시작합니다.</p><p>셋째, 웨이터. 나이트의 웨이터는 서빙만 하는 게 아닙니다. 자리 안내, 분위기 조절, 파트너 매칭까지. 처음이라면 웨이터에게 먼저 인사하세요. 밤의 질이 달라집니다.</p><p>넷째, 귀가. 대리운전 앱 미리 깔아두세요. 새벽에 택시 잡기는 전쟁입니다.</p>'},
    {title:'호빠 완벽 가이드 — 여성이 알아야 할 모든 것',
     body:'<p>호빠가 궁금하지만 선뜻 가기 어려운 분들을 위한 글입니다. 솔직하게, 있는 그대로 정리했습니다.</p><p>호빠는 여성 고객을 위한 유흥 공간입니다. 남성 호스트가 대화 상대가 되어주고, 즐거운 시간을 만들어줍니다. 불편한 상황이 생기면 바로 호스트를 바꿀 수 있습니다.</p><p>예산은 업소마다 다릅니다. 미리 전화해서 확인하세요. 처음이라고 하면 친절하게 안내해줍니다.</p><p>혼자 가도 됩니다. 실제로 혼자 오는 분이 꽤 많습니다. 친구와 함께 가면 더 재미있지만, 혼자라고 어색할 건 전혀 없습니다.</p><p>안전이 걱정되시나요? CCTV, 보안 요원이 상주하는 곳을 선택하세요. 놀쿨에서 검증된 곳만 소개합니다.</p>'}
  ];
  var magHtml = articles.map(function(a,i){
    return '<div style="background:#fff;border:1px solid #D1D5DB;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">'+
      '<h2 style="font-size:18px;font-weight:800;color:#111;margin-bottom:12px;">'+escapeHtml(a.title)+'</h2>'+
      '<div style="font-size:15px;color:#333;line-height:1.8;">'+a.body+'</div></div>';
  }).join('');

  pages.push({dir:'magazine',file:'index.html', html: communityShell(
    '매거진 — 밤문화 가이드',
    '강남 vs 홍대 어디가 나을까? 처음 가는 사람 완벽 가이드까지. 읽다 보면 3분 순삭.',
    magHtml+
    '<div class="cta-box" style="margin-top:16px;"><div class="cta-icon">&#128218;</div><div class="cta-title">더 많은 매거진</div><div class="cta-desc">놀쿨에서 매주 새로운 매거진이 업데이트됩니다.</div><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="cta-btn">놀쿨에서 더 보기 &rarr;</a></div>'
  )});

  // ── EVENTS PAGE ──
  pages.push({dir:'events',file:'index.html', html: communityShell(
    '이벤트 · 파티 캘린더',
    '이번 주말 어디서 파티? 전국 나이트·클럽 이벤트·DJ공연·할인 정보 한눈에. 놓치면 후회.',
    '<p style="color:#333;margin-bottom:20px;">전국 업소의 이벤트, 파티, 특별 공연 정보를 모았습니다. 매주 업데이트됩니다.</p>'+
    '<div style="background:#F8F7FF;border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">이번 주 주목할 이벤트</h3>'+
    '<div style="padding:12px;border-left:3px solid #8B5CF6;margin-bottom:12px;background:#fff;border-radius:0 12px 12px 0;">'+
    '<p style="font-size:15px;font-weight:700;color:#111;">금요일 · 전국 나이트 주말 오픈</p>'+
    '<p style="font-size:13px;color:#555;">매주 금요일은 전국 나이트가 가장 뜨겁습니다. 밤 10시부터 피크.</p></div>'+
    '<div style="padding:12px;border-left:3px solid #06B6D4;margin-bottom:12px;background:#fff;border-radius:0 12px 12px 0;">'+
    '<p style="font-size:15px;font-weight:700;color:#111;">토요일 · 클럽 DJ 파티</p>'+
    '<p style="font-size:13px;color:#555;">강남·홍대·이태원 클럽에서 매주 토요일 게스트 DJ 파티. 라인업은 각 업소 확인.</p></div>'+
    '<div style="padding:12px;border-left:3px solid #22C55E;background:#fff;border-radius:0 12px 12px 0;">'+
    '<p style="font-size:15px;font-weight:700;color:#111;">주중 · 할인 이벤트</p>'+
    '<p style="font-size:13px;color:#555;">화~목 방문 시 입장료 할인, 웰컴 드링크 등 혜택이 있는 업소가 많습니다.</p></div>'+
    '</div>'+
    '<div class="cta-box"><div class="cta-icon">&#128197;</div><div class="cta-title">최신 이벤트 정보</div><div class="cta-desc">업소별 실시간 이벤트는 놀쿨에서 확인하세요.</div><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="cta-btn">놀쿨에서 이벤트 보기 &rarr;</a></div>'
  )});

  return pages;
}

/* ══════════ INTERACTIVE PAGES ══════════ */
function generateInteractivePages(venues) {
  var pages = [];
  var MAIN = MAIN_URL;

  // ── Quiz: 밤문화 취향 테스트 ──
  pages.push({file:'quiz.html', html: communityShell(
    '나에게 맞는 밤문화 유형은?',
    '3문제면 끝! 나는 클럽형? 라운지형? 내 밤문화 유형 테스트하고 딱 맞는 업소 추천받기.',
    '<div id="quizApp">'+
    '<div id="quizQ" style="font-size:20px;font-weight:800;color:#111;margin-bottom:20px;text-align:center;min-height:60px;"></div>'+
    '<div id="quizBtns" style="display:flex;flex-direction:column;gap:10px;"></div>'+
    '<div id="quizResult" style="display:none;text-align:center;padding:24px 0;">'+
    '<div id="quizType" style="font-size:24px;font-weight:900;color:#8B5CF6;margin-bottom:8px;"></div>'+
    '<div id="quizDesc" style="font-size:15px;color:#333;margin-bottom:16px;line-height:1.7;"></div>'+
    '<div id="quizRec" style="margin-bottom:16px;"></div>'+
    '<button onclick="startQuiz()" style="padding:12px 28px;background:#8B5CF6;color:#fff;font-size:14px;font-weight:700;border:none;border-radius:999px;cursor:pointer;font-family:inherit;">다시 하기</button>'+
    '</div></div>'+
    '<script>'+
    'var qs=[{q:"어떤 분위기를 원하세요?",a:["시끄럽고 신나게! \\ud83d\\udd0a","조용하고 분위기 있게 \\ud83e\\udd2b","프라이빗하게 우리끼리 \\ud83d\\udd12"]},'+
    '{q:"인원은 몇 명?",a:["혼자 또는 2명 \\ud83d\\udc64","4~6명 소그룹 \\ud83d\\udc65","10명 이상 대규모 \\ud83c\\udf89"]},'+
    '{q:"춤을 추고 싶나요?",a:["당연하지! 댄스 필수 \\ud83d\\udc83","앉아서 편하게 \\ud83d\\udecb\\ufe0f","상관없어 \\ud83e\\udd37"]}];'+
    'var scores=[0,0,0,0,0,0],ci=0;'+
    'var types=['+
    '{n:"클럽형",d:"EDM과 레이저 사이에서 밤을 불태우는 타입. 사운드가 몸을 흔들 때 가장 행복합니다.",cat:"클럽"},'+
    '{n:"나이트형",d:"라이브 밴드와 부킹. 사람들과 어울리는 게 좋은 소셜 타입입니다.",cat:"나이트"},'+
    '{n:"라운지형",d:"칵테일 한 잔과 조용한 대화. 세련된 밤을 즐기는 타입입니다.",cat:"라운지"},'+
    '{n:"룸형",d:"우리끼리 프라이빗하게. 모임과 접대에 능한 비즈니스 타입입니다.",cat:"룸"},'+
    '{n:"요정형",d:"전통과 격식. 한정식과 국악이 어우러지는 품격 있는 밤을 즐깁니다.",cat:"요정"},'+
    '{n:"호빠형",d:"편안하고 즐거운 시간. 호스트의 에스코트를 받으며 특별한 밤을 보냅니다.",cat:"호빠"}];'+
    'function startQuiz(){ci=0;scores=[0,0,0,0,0,0];document.getElementById("quizResult").style.display="none";showQ();}'+
    'function showQ(){if(ci>=qs.length){showResult();return;}'+
    'document.getElementById("quizQ").textContent=(ci+1)+"/"+qs.length+" "+qs[ci].q;'+
    'document.getElementById("quizBtns").innerHTML=qs[ci].a.map(function(a,i){'+
    'return\'<button onclick="answer(\'+i+\')" style="padding:14px;border:1px solid #D1D5DB;border-radius:12px;background:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;color:#111;text-align:left;">\'+a+\'<\\/button>\';}).join("");}'+
    'function answer(i){if(i===0){scores[0]+=2;scores[1]+=1;}else if(i===1){scores[2]+=2;scores[3]+=1;scores[4]+=1;}else{scores[3]+=1;scores[5]+=1;}ci++;showQ();}'+
    'function showResult(){var mx=0,mi=0;scores.forEach(function(s,i){if(s>mx){mx=s;mi=i;}});'+
    'var t=types[mi];document.getElementById("quizType").textContent="당신은 "+t.n+"!";'+
    'document.getElementById("quizDesc").textContent=t.d;'+
    'document.getElementById("quizResult").style.display="block";'+
    'document.getElementById("quizBtns").innerHTML="";document.getElementById("quizQ").textContent="";}'+
    'startQuiz();'+
    '<\\/script>'
  )});

  // ── Safety: 음주 계산기 + SOS ──
  pages.push({file:'safety.html', html: communityShell(
    '안전한 밤을 위한 도구',
    '소주 3잔이면 혈중알코올 얼마? 음주 계산기+긴급전화 112/119+귀가 안전 팁. 나가기 전 확인.',
    '<h2 style="font-size:20px;font-weight:800;margin-bottom:16px;">음주 계산기</h2>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:24px;margin-bottom:24px;">'+
    '<div style="margin-bottom:12px;"><label style="font-size:14px;font-weight:600;display:block;margin-bottom:4px;">체중 (kg)</label>'+
    '<input type="number" id="drinkWeight" value="70" style="width:100%;padding:12px;border:1px solid #D1D5DB;border-radius:12px;font-size:16px;font-family:inherit;"/></div>'+
    '<div style="margin-bottom:12px;"><label style="font-size:14px;font-weight:600;display:block;margin-bottom:4px;">소주 (잔)</label>'+
    '<input type="number" id="drinkSoju" value="0" style="width:100%;padding:12px;border:1px solid #D1D5DB;border-radius:12px;font-size:16px;font-family:inherit;"/></div>'+
    '<div style="margin-bottom:12px;"><label style="font-size:14px;font-weight:600;display:block;margin-bottom:4px;">맥주 (잔)</label>'+
    '<input type="number" id="drinkBeer" value="0" style="width:100%;padding:12px;border:1px solid #D1D5DB;border-radius:12px;font-size:16px;font-family:inherit;"/></div>'+
    '<button id="drinkCalcBtn" style="width:100%;padding:14px;background:#DC2626;color:#fff;font-size:16px;font-weight:700;border:none;border-radius:12px;cursor:pointer;font-family:inherit;">계산하기</button>'+
    '<div id="drinkResult" style="margin-top:16px;text-align:center;font-size:18px;font-weight:800;min-height:28px;color:#DC2626;"></div></div>'+
    '<h2 style="font-size:20px;font-weight:800;margin-bottom:16px;">긴급 연락처</h2>'+
    '<div style="display:grid;gap:8px;">'+
    '<a href="tel:112" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:12px;padding:16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;text-decoration:none;color:#111;font-weight:700;font-size:16px;">&#128680; 경찰 112</a>'+
    '<a href="tel:119" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:12px;padding:16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;text-decoration:none;color:#111;font-weight:700;font-size:16px;">&#128657; 소방/구급 119</a>'+
    '<a href="tel:1366" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:12px;padding:16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;text-decoration:none;color:#111;font-weight:700;font-size:16px;">&#128156; 여성긴급 1366</a>'+
    '</div>'+
    '<div style="background:#F8F7FF;border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-top:24px;">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:8px;">귀가 안전 팁</h3>'+
    '<p style="color:#333;line-height:1.8;">1. 대리운전 앱을 미리 설치하세요.<br>2. 택시 탈 때 차량 번호를 친구에게 보내세요.<br>3. 혼자 걸어가지 마세요. 가급적 택시 이용.<br>4. 소지품(핸드폰, 지갑)을 꼭 확인하세요.<br>5. 음주 후 운전은 절대 금지입니다.</p></div>'+
    '<script>document.getElementById("drinkCalcBtn").addEventListener("click",function(){'+
    'var w=parseInt(document.getElementById("drinkWeight").value)||70;'+
    'var s=parseInt(document.getElementById("drinkSoju").value)||0;'+
    'var b=parseInt(document.getElementById("drinkBeer").value)||0;'+
    'var alc=(s*8.4+b*9.6);var bac=alc/(w*0.68*10);'+
    'var h=Math.ceil(bac/0.015);'+
    'var msg="예상 혈중알코올: "+bac.toFixed(3)+"%";'+
    'if(bac>=0.03)msg+=" (음주운전 기준 초과!)";'+
    'msg+="\\n해소 시간: 약 "+h+"시간";'+
    'document.getElementById("drinkResult").textContent=msg;});<\\/script>'
  )});

  // ── Dresscode checker ──
  pages.push({file:'dresscode.html', html: communityShell(
    '드레스코드 체커',
    '지금 입은 옷으로 입장 가능? 클럽·나이트·라운지·요정 6종 업종별 입장 판정. 3초면 끝.',
    '<h2 style="font-size:20px;font-weight:800;margin-bottom:16px;">입장 가능할까?</h2>'+
    '<p style="margin-bottom:16px;color:#333;">아래 항목을 선택하면 업종별 입장 가능 여부를 알려드립니다.</p>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">'+
    '<div style="margin-bottom:16px;"><p style="font-weight:700;margin-bottom:8px;">상의</p>'+
    '<select id="dcTop" style="width:100%;padding:12px;border:1px solid #D1D5DB;border-radius:12px;font-size:15px;font-family:inherit;">'+
    '<option value="shirt">셔츠/블라우스</option><option value="tshirt">티셔츠</option><option value="hoodie">후드/맨투맨</option><option value="sleeveless">민소매</option></select></div>'+
    '<div style="margin-bottom:16px;"><p style="font-weight:700;margin-bottom:8px;">하의</p>'+
    '<select id="dcBottom" style="width:100%;padding:12px;border:1px solid #D1D5DB;border-radius:12px;font-size:15px;font-family:inherit;">'+
    '<option value="slacks">슬랙스/정장바지</option><option value="jeans">청바지</option><option value="shorts">반바지</option><option value="jogger">트레이닝/조거</option></select></div>'+
    '<div style="margin-bottom:16px;"><p style="font-weight:700;margin-bottom:8px;">신발</p>'+
    '<select id="dcShoes" style="width:100%;padding:12px;border:1px solid #D1D5DB;border-radius:12px;font-size:15px;font-family:inherit;">'+
    '<option value="dress">구두/로퍼</option><option value="sneaker">운동화/스니커즈</option><option value="sandal">샌들/슬리퍼</option></select></div>'+
    '<button id="dcCheckBtn" style="width:100%;padding:14px;background:#8B5CF6;color:#fff;font-size:16px;font-weight:700;border:none;border-radius:12px;cursor:pointer;font-family:inherit;">체크하기</button>'+
    '<div id="dcResult" style="margin-top:16px;"></div></div>'+
    '<script>document.getElementById("dcCheckBtn").addEventListener("click",function(){'+
    'var t=document.getElementById("dcTop").value;'+
    'var b=document.getElementById("dcBottom").value;'+
    'var s=document.getElementById("dcShoes").value;'+
    'var r=document.getElementById("dcResult");'+
    'var club=(t==="shirt"&&b!=="shorts"&&b!=="jogger"&&s==="dress");'+
    'var night=(t!=="sleeveless"&&b!=="shorts"&&s!=="sandal");'+
    'var lounge=night;var room=true;var yojeong=(t==="shirt"&&b==="slacks");'+
    'var html="<div style=\\"margin-top:12px;\\">";'+
    'html+="<p style=\\"padding:8px 12px;border-radius:8px;margin-bottom:6px;font-weight:600;"+(club?"background:#F0FDF4;color:#16A34A\\">클럽 ✅ 입장 가능":"background:#FEF2F2;color:#DC2626\\">클럽 ❌ 입장 불가")+"</p>";'+
    'html+="<p style=\\"padding:8px 12px;border-radius:8px;margin-bottom:6px;font-weight:600;"+(night?"background:#F0FDF4;color:#16A34A\\">나이트 ✅ 입장 가능":"background:#FEF2F2;color:#DC2626\\">나이트 ❌ 입장 불가")+"</p>";'+
    'html+="<p style=\\"padding:8px 12px;border-radius:8px;margin-bottom:6px;font-weight:600;"+(lounge?"background:#F0FDF4;color:#16A34A\\">라운지 ✅ 입장 가능":"background:#FEF2F2;color:#DC2626\\">라운지 ❌ 입장 불가")+"</p>";'+
    'html+="<p style=\\"padding:8px 12px;border-radius:8px;margin-bottom:6px;font-weight:600;background:#F0FDF4;color:#16A34A\\">룸 ✅ 입장 가능</p>";'+
    'html+="<p style=\\"padding:8px 12px;border-radius:8px;margin-bottom:6px;font-weight:600;"+(yojeong?"background:#F0FDF4;color:#16A34A\\">요정 ✅ 입장 가능":"background:#FEF2F2;color:#DC2626\\">요정 ❌ 정장 추천")+"</p>";'+
    'html+="<p style=\\"padding:8px 12px;border-radius:8px;font-weight:600;background:#F0FDF4;color:#16A34A\\">호빠 ✅ 입장 가능</p>";'+
    'html+="</div>";r.innerHTML=html;});<\\/script>'
  )});

  return pages;
}

/* ══════════ COMMUNITY PAGES ══════════ */
function communityShell(title, desc, bodyHtml) {
  return '<!doctype html>\n<html lang="ko">\n<head>\n'+
    '<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1.0"/>\n'+
    '<title>'+escapeHtml(title)+' | 놀쿨</title>\n'+
    '<meta name="description" content="'+escapeHtml(desc)+'"/>\n'+
    '<meta name="robots" content="index,follow"/>\n'+
    '<meta name="theme-color" content="#FFFFFF"/>\n'+
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>\n'+
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>\n'+
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'+
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;900&display=swap" rel="stylesheet"/>\n'+
    '<link href="/style.css" rel="stylesheet"/>\n'+
    '</head>\n<body>\n'+
    '<div class="bamki-banner"><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer">&#9733; 프리미엄 정보+실시간 예약은 <strong>놀쿨</strong>에서 &#9733; &rarr;</a></div>\n'+
    navHtml()+'\n'+
    '<header class="cat-hero"><h1 class="cat-hero-title">'+escapeHtml(title)+'</h1></header>\n'+
    '<main class="section"><div class="section-inner" style="font-size:16px;color:#333;line-height:1.8;">'+bodyHtml+'</div></main>\n'+
    '<div class="large-cta"><div class="large-cta-title">더 많은 정보와 커뮤니티<br>놀쿨에서 참여하세요</div>'+
    '<a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="large-cta-btn">놀쿨 바로가기 &rarr;</a></div>\n'+
    '<footer class="footer">'+
    '<a href="https://open.kakao.com/o/s0VwwVhh" target="_blank" rel="noopener noreferrer" class="ad-banner"><span class="ad-badge">AD</span><span class="ad-title">광고문의</span><span class="ad-kakao">카톡 : besta12</span><span class="ad-btn">KakaoTalk</span></a>'+
    '<p class="footer-slogan" style="font-size:13px;color:#8B5CF6;margin-bottom:12px;">놀쿨 — 도시의 밤을 지배하라</p>'+
    '<p class="footer-brand">NOLCOOL NIGHTLIFE</p>'+
    '<p class="footer-copy">&copy; <script>document.write(new Date().getFullYear())<\/script> 놀쿨. 정보 제공 목적.</p></footer>\n'+
    '<script defer src="/engage.js"><\/script>\n'+
    '</body>\n</html>';
}

function generateCommunityPages(venues) {
  var pages = [];

  // Main community page
  var topVenues = venues.slice(0,6).map(function(v){
    return '<a href="/v/'+encodeURI(v._slug)+'/" target="_blank" rel="noopener noreferrer" style="display:block;padding:14px;border:1px solid #D1D5DB;border-radius:16px;margin-bottom:8px;text-decoration:none;color:#111;box-shadow:0 1px 3px rgba(0,0,0,0.08);">'+
      '<strong>'+escapeHtml(v.name)+'</strong> <span style="color:#555;">'+escapeHtml(v.region)+' · '+escapeHtml(v.type)+'</span></a>';
  }).join('');
  pages.push({file:'index.html', html: communityShell(
    '커뮤니티',
    '밤문화 고수들의 실전 팁부터 패션 가이드까지. 처음 가는 사람 필수 확인. 놀쿨 커뮤니티.',
    '<h2 style="font-size:20px;font-weight:800;margin-bottom:16px;">밤문화 커뮤니티</h2>'+
    '<p>놀쿨 커뮤니티에서 다양한 정보를 나누세요. 후기, 팁, 패션, 파티 모집까지.</p>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0;">'+
    '<a href="/community/tips.html" target="_blank" rel="noopener noreferrer" class="cta-btn" style="text-align:center;display:block;padding:14px;border-radius:12px;">팁·노하우</a>'+
    '<a href="/community/fashion.html" target="_blank" rel="noopener noreferrer" class="cta-btn cyan" style="text-align:center;display:block;padding:14px;border-radius:12px;">패션·드레스코드</a>'+
    '<a href="/community/calculator.html" target="_blank" rel="noopener noreferrer" class="cta-btn" style="text-align:center;display:block;padding:14px;border-radius:12px;background:#22C55E;">N빵 계산기</a>'+
    '<a href="/community/guidelines.html" target="_blank" rel="noopener noreferrer" class="cta-btn purple" style="text-align:center;display:block;padding:14px;border-radius:12px;">이용 규칙</a>'+
    '</div>'+
    '<h3 style="font-size:18px;font-weight:700;margin:24px 0 12px;">이번 주 인기 업소</h3>'+topVenues+
    '<div class="cta-box" style="margin-top:24px;"><div class="cta-icon">&#128172;</div><div class="cta-title">글쓰기·댓글·리뷰는 놀쿨에서</div><div class="cta-desc">서브사이트는 정보 열람만 가능합니다.<br>글쓰기, 댓글, 리뷰 작성은 놀쿨에서 참여하세요.</div><a href="'+MAIN_URL+'" target="_blank" rel="noopener noreferrer" class="cta-btn">놀쿨에서 참여하기 &rarr;</a></div>'
  )});

  // Tips page
  pages.push({file:'tips.html', html: communityShell(
    '밤문화 팁·노하우',
    '도착 시간, 웨이터 팁, 귀가 전략까지. 아무도 안 알려주는 실전 노하우 5가지. 지금 확인.',
    '<h2 style="font-size:20px;font-weight:800;margin-bottom:16px;">실전에서 바로 쓰는 팁</h2>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:8px;">1. 도착 시간이 분위기를 결정한다</h3>'+
    '<p>나이트는 밤 10시~11시가 황금 시간. 너무 이르면 썰렁하고, 자정 넘으면 자리 잡기 어렵습니다. 클럽은 자정 전후가 피크. 라운지는 저녁 8시부터 분위기가 잡힙니다.</p></div>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:8px;">2. 웨이터와 친해지면 밤이 달라진다</h3>'+
    '<p>나이트에서 웨이터는 단순 서빙이 아닙니다. 자리 배정, 분위기 조절, 파트너 매칭까지. 처음 가면 웨이터에게 먼저 인사하세요. 그 밤의 질이 달라집니다.</p></div>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:8px;">3. 귀가 계획은 미리</h3>'+
    '<p>새벽 시간 대중교통은 끊깁니다. 대리운전 앱을 미리 깔아두거나, 택시 호출 타이밍을 잡아야 합니다. 음주 후 운전은 절대 금지.</p></div>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:8px;">4. 주중이 오히려 좋을 수 있다</h3>'+
    '<p>금토 밤은 사람이 많고 입장료도 비쌉니다. 화~목은 한산하고, 할인 혜택도 있고, 웨이터 서비스도 여유롭습니다. 처음이라면 주중 추천.</p></div>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:20px;">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:8px;">5. 소지품 관리는 필수</h3>'+
    '<p>핸드폰, 지갑, 카드는 항상 몸에. 테이블에 두고 자리 비우면 분실 위험. 귀중품은 최소한만 가져가세요.</p></div>'
  )});

  // Fashion page
  pages.push({file:'fashion.html', html: communityShell(
    '드레스코드·패션 가이드',
    '입장 거부당하기 싫다면? 클럽·나이트·라운지·요정 업종별 드레스코드 완벽 정리. 가기 전 확인.',
    '<h2 style="font-size:20px;font-weight:800;margin-bottom:16px;">업종별 드레스코드</h2>'+
    '<div style="background:#F8F7FF;border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="color:#8B5CF6;font-size:16px;font-weight:700;margin-bottom:8px;">클럽</h3>'+
    '<p>가장 까다롭습니다. 셔츠+슬랙스+구두가 기본. 슬리퍼, 반바지, 운동복 절대 불가. 청담·압구정은 특히 엄격합니다. 홍대·이태원은 상대적으로 자유롭지만 기본은 갖추세요.</p></div>'+
    '<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="color:#EA580C;font-size:16px;font-weight:700;margin-bottom:8px;">나이트</h3>'+
    '<p>클럽보다 자유롭습니다. 깔끔한 캐주얼이면 충분. 슬리퍼, 반바지는 피하세요. 셔츠 필수는 아니지만, 깔끔할수록 대우가 좋아집니다.</p></div>'+
    '<div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="color:#0D9488;font-size:16px;font-weight:700;margin-bottom:8px;">라운지</h3>'+
    '<p>스마트 캐주얼. 편안하되 세련되게. 라운지는 분위기가 중요해서, 옷도 분위기에 맞추면 좋습니다.</p></div>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-bottom:16px;">'+
    '<h3 style="color:#1E3A5F;font-size:16px;font-weight:700;margin-bottom:8px;">룸·요정</h3>'+
    '<p>비즈니스 캐주얼 이상. 접대 자리라면 정장. 요정은 특히 격식을 중시합니다.</p></div>'+
    '<div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:16px;padding:20px;">'+
    '<h3 style="color:#DC2626;font-size:16px;font-weight:700;margin-bottom:8px;">호빠</h3>'+
    '<p>편하게 입고 가세요. 특별한 드레스코드는 없습니다. 본인이 편한 옷이 가장 좋습니다.</p></div>'
  )});

  // N빵 Calculator
  pages.push({file:'calculator.html', html: communityShell(
    'N빵 계산기',
    '2차까지 가면 얼마? 총 금액 입력하면 1인당 자동 계산. 술자리 필수 도구.',
    '<h2 style="font-size:20px;font-weight:800;margin-bottom:16px;">N빵 계산기</h2>'+
    '<p style="margin-bottom:16px;">총 금액과 인원수를 입력하면 1인당 금액을 자동 계산합니다.</p>'+
    '<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">'+
    '<div style="margin-bottom:12px;"><label style="font-size:14px;font-weight:600;color:#333;display:block;margin-bottom:4px;">총 금액 (원)</label>'+
    '<input type="number" id="calcTotal" placeholder="예: 500000" style="width:100%;padding:12px;border:1px solid #D1D5DB;border-radius:12px;font-size:16px;font-family:inherit;"/></div>'+
    '<div style="margin-bottom:12px;"><label style="font-size:14px;font-weight:600;color:#333;display:block;margin-bottom:4px;">인원수</label>'+
    '<input type="number" id="calcPeople" placeholder="예: 5" style="width:100%;padding:12px;border:1px solid #D1D5DB;border-radius:12px;font-size:16px;font-family:inherit;"/></div>'+
    '<button id="calcBtn" style="width:100%;padding:14px;background:#8B5CF6;color:#fff;font-size:16px;font-weight:700;border:none;border-radius:12px;cursor:pointer;font-family:inherit;">계산하기</button>'+
    '<div id="calcResult" style="margin-top:16px;text-align:center;font-size:24px;font-weight:900;color:#8B5CF6;min-height:36px;"></div>'+
    '</div>'+
    '<script>document.getElementById("calcBtn").addEventListener("click",function(){var t=parseInt(document.getElementById("calcTotal").value)||0;var p=parseInt(document.getElementById("calcPeople").value)||1;if(p<1)p=1;document.getElementById("calcResult").textContent="1인당 "+Math.ceil(t/p).toLocaleString()+"원";});<\/script>'
  )});

  // Guidelines
  pages.push({file:'guidelines.html', html: communityShell(
    '커뮤니티 이용 규칙',
    '놀쿨 커뮤니티 이용 규칙. 상호 존중·허위정보 금지·광고 금지·개인정보 보호.',
    '<h2 style="font-size:20px;font-weight:800;margin-bottom:16px;">이용 규칙</h2>'+
    '<div style="background:#F9FAFB;border-radius:16px;padding:20px;line-height:2;">'+
    '<p><strong>1. 상호 존중</strong><br>다른 사용자를 존중하세요. 비하, 모욕, 차별적 발언은 금지입니다.</p>'+
    '<p><strong>2. 허위 정보 금지</strong><br>확인되지 않은 정보를 사실처럼 작성하지 마세요. 특정 업소에 대한 허위 리뷰도 금지입니다.</p>'+
    '<p><strong>3. 광고·홍보 금지</strong><br>영리 목적의 광고, 홍보글은 삭제됩니다. 광고는 공식 채널(카톡 besta12)로 문의하세요.</p>'+
    '<p><strong>4. 불법 콘텐츠 금지</strong><br>불법 행위를 조장하거나, 음란물을 게시하면 즉시 삭제 및 이용 제한됩니다.</p>'+
    '<p><strong>5. 개인정보 보호</strong><br>타인의 전화번호, 주소, 실명 등 개인정보를 동의 없이 게시하지 마세요.</p>'+
    '<p><strong>6. 신고 제도</strong><br>규칙을 위반하는 글이나 댓글을 발견하면 신고해주세요. 검토 후 조치합니다.</p>'+
    '</div>'
  )});

  return pages;
}

/* ══════════ MAIN.JS GENERATION ══════════ */
function generateMainJs(venues) {
  var listingsStr = "var listings = " + JSON.stringify(venues.map(function(v){
    return {
      name:v.name, region:v.region, type:v.type, addr:v.addr, hours:v.hours,
      hook:v.hook, value:v.value, tags:v.tags, _slug:v._slug,
      nickname:v.nickname||"", phone:v.phone||""
    };
  }), null, 0) + ";\n";

  var clientJs = `
(function(){
  var grid=document.getElementById('grid');
  var noResults=document.getElementById('noResults');
  var listingCount=document.getElementById('listingCount');
  var searchInput=document.getElementById('searchInput');
  var searchDropdown=document.getElementById('searchDropdown');
  var premiumEl=document.getElementById('premiumCards');
  var rankEl=document.getElementById('rankCards');
  var currentRegion='all';

  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function normalize(s){return s.replace(/\\s/g,'').toLowerCase();}

  var searchIdx=listings.map(function(v){
    return {v:v, norm:normalize(v.name+v.region+v.type+v.tags.join(''))};
  });

  // Dynamic filter buttons from actual regions
  var regionSet={};
  listings.forEach(function(v){regionSet[v.region]=(regionSet[v.region]||0)+1;});
  var topRegions=Object.keys(regionSet).sort(function(a,b){return regionSet[b]-regionSet[a];}).slice(0,20);
  var filterContainer=document.getElementById('filterBtns');
  if(filterContainer){
    topRegions.forEach(function(r){
      var b=document.createElement('button');
      b.className='filter-btn';b.dataset.region=r;b.textContent=r;
      filterContainer.appendChild(b);
    });
  }

  // Premium cards (일산명월관요정 + 일산룸 first, then others with phone)
  function renderPremium(){
    var priority=['일산명월관요정','일산룸'];
    var premium=[];
    priority.forEach(function(n){var f=listings.find(function(v){return v.name===n;});if(f)premium.push(f);});
    listings.forEach(function(v){if(v.phone&&priority.indexOf(v.name)<0)premium.push(v);});
    premiumEl.innerHTML=premium.map(function(v){
      var hookH=esc(v.hook).replace(/\\n/g,'<br>');
      return '<div class="premium-card">'+
        '<span class="premium-badge">PREMIUM</span>'+
        '<h3 class="premium-name">'+esc(v.name)+'</h3>'+
        '<p class="premium-type">'+esc(v.type)+'</p>'+
        '<p class="premium-hook">'+hookH+'</p>'+
        (v.nickname?'<p class="premium-nickname">'+esc(v.nickname)+' 예약문의</p>':'')+
        (v.phone?'<a href="tel:'+v.phone.replace(/-/g,'')+'" class="premium-phone" target="_blank" rel="noopener noreferrer">'+esc(v.phone)+'</a>':'')+
        '<a href="/v/'+encodeURI(v._slug)+'/" class="premium-detail-btn" target="_blank" rel="noopener noreferrer">상세보기 &rarr;</a>'+
        '</div>';
    }).join('');
  }

  // Rank cards (top 5)
  function renderRanks(){
    var top5=listings.slice(0,5);
    rankEl.innerHTML=top5.map(function(v,i){
      return '<a href="/v/'+encodeURI(v._slug)+'/" class="rank-card" target="_blank" rel="noopener noreferrer">'+
        '<span class="rank-badge" style="background:#8B5CF6">'+(i+1)+'</span>'+
        '<span class="rank-name">'+esc(v.name)+'</span>'+
        '<span class="rank-region">'+esc(v.region)+'</span>'+
        '<span class="rank-arrow">&rarr;</span></a>';
    }).join('');
  }

  function renderCards(list){
    if(!list.length){grid.innerHTML='';noResults.style.display='block';listingCount.textContent='';return;}
    noResults.style.display='none';
    listingCount.textContent='총 '+list.length+'개 업소';
    grid.innerHTML=list.map(function(v){
      var hookH=esc(v.hook).replace(/\\n/g,'<br>');
      var tagsH=v.tags.map(function(t){return'<span class="card-tag">'+esc(t)+'</span>';}).join('');
      return '<article class="card" role="listitem">'+
        '<a href="/v/'+encodeURI(v._slug)+'/" class="card-link" target="_blank" rel="noopener noreferrer">'+
        '<div class="card-body"><div class="card-meta"><span class="card-region">'+esc(v.region)+'</span><span class="card-type">'+esc(v.type)+'</span></div>'+
        '<h3 class="card-name">'+esc(v.name)+'</h3><p class="card-hook">'+hookH+'</p><p class="card-value">'+esc(v.value)+'</p>'+
        '<div class="card-tags">'+tagsH+'</div><span class="card-detail-btn">상세보기 &rarr;</span></div></a></article>';
    }).join('');
  }

  function filterCards(){
    var filtered=currentRegion==='all'?listings:listings.filter(function(v){return v.region===currentRegion;});
    renderCards(filtered);
  }

  // Filter click (delegated)
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.filter-btn');
    if(btn){
      document.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      currentRegion=btn.dataset.region;
      if(searchInput)searchInput.value='';
      if(searchDropdown)searchDropdown.classList.remove('open');
      filterCards();
    }
    if(!e.target.closest('.search-box')&&searchDropdown)searchDropdown.classList.remove('open');
  });

  // Search
  if(searchInput) searchInput.addEventListener('input',function(){
    var q=normalize(this.value);
    if(q.length<1){searchDropdown.classList.remove('open');filterCards();return;}
    var matches=searchIdx.filter(function(s){return s.norm.includes(q);}).slice(0,8);
    if(!matches.length){searchDropdown.classList.remove('open');renderCards([]);return;}
    searchDropdown.innerHTML=matches.map(function(s){
      var v=s.v;
      return '<a href="/v/'+encodeURI(v._slug)+'/" class="dd-item" target="_blank" rel="noopener noreferrer">'+
        '<div class="dd-info"><span class="dd-name">'+esc(v.name)+'</span><span class="dd-region">'+esc(v.region)+' · '+esc(v.type)+'</span></div>'+
        '<span class="dd-arrow">&rarr;</span></a>';
    }).join('');
    searchDropdown.classList.add('open');
    renderCards(matches.map(function(s){return s.v;}));
  });

  // Popular tags click
  document.querySelectorAll('.ptag').forEach(function(t){
    t.addEventListener('click',function(){
      var q=this.dataset.q;
      if(searchInput){searchInput.value=q;searchInput.dispatchEvent(new Event('input'));}
    });
  });

  // [A] Roulette
  var rouletteBtn=document.getElementById('rouletteBtn');
  var rouletteResult=document.getElementById('rouletteResult');
  if(rouletteBtn) rouletteBtn.addEventListener('click',function(){
    var r=listings[Math.floor(Math.random()*listings.length)];
    rouletteResult.innerHTML='<a href="/v/'+encodeURI(r._slug)+'/" target="_blank" rel="noopener noreferrer" style="color:#8B5CF6;text-decoration:none;">'+esc(r.name)+' ('+esc(r.region)+' · '+esc(r.type)+')</a>';
  });

  // [B] VS Vote
  var vsContent=document.getElementById('vsContent');
  if(vsContent){
    var a=listings[Math.floor(Math.random()*listings.length)];
    var b=listings[Math.floor(Math.random()*listings.length)];
    while(b.name===a.name)b=listings[Math.floor(Math.random()*listings.length)];
    var vA=0,vB=0;
    function renderVS(){
      vsContent.innerHTML=
        '<div style="display:flex;gap:8px;margin-bottom:12px;">'+
        '<button class="vs-a" style="flex:1;padding:12px;border:2px solid #8B5CF6;border-radius:12px;background:#F8F7FF;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;color:#111;">'+esc(a.name)+'<br><span style="font-size:20px;color:#8B5CF6;">'+vA+'</span></button>'+
        '<span style="display:flex;align-items:center;font-weight:900;color:#8B5CF6;font-size:18px;">VS</span>'+
        '<button class="vs-b" style="flex:1;padding:12px;border:2px solid #06B6D4;border-radius:12px;background:#F0FDFA;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;color:#111;">'+esc(b.name)+'<br><span style="font-size:20px;color:#06B6D4;">'+vB+'</span></button>'+
        '</div>';
      vsContent.querySelector('.vs-a').addEventListener('click',function(){vA++;renderVS();});
      vsContent.querySelector('.vs-b').addEventListener('click',function(){vB++;renderVS();});
    }
    renderVS();
  }

  // [E] Hot Now
  var hotNow=document.getElementById('hotNow');
  var hotTime=document.getElementById('hotTime');
  if(hotNow){
    var h=new Date().getHours();
    var hot=listings[h%listings.length];
    hotNow.textContent=hot.name+' ('+hot.region+')';
    if(h>=22||h<4)hotTime.textContent='지금은 피크 타임! 밤 10시~새벽 4시가 가장 뜨겁습니다.';
    else if(h>=18)hotTime.textContent='슬슬 분위기가 달아오르는 시간. 밤 10시부터 본격 피크!';
    else hotTime.textContent='아직 이른 시간. 오후 8시부터 업소들이 문을 엽니다.';
  }

  // Slide-up after 3 min
  setTimeout(function(){var el=document.getElementById('slideupPopup');if(el)el.classList.add('show');},180000);
  // Scroll 80% banner
  var _sb=false;
  window.addEventListener('scroll',function(){
    var p=(window.scrollY+window.innerHeight)/document.body.scrollHeight;
    if(p>0.8&&!_sb){var el=document.getElementById('scrollBanner');if(el)el.classList.add('show');_sb=true;}
  });

  // Init
  renderPremium();
  renderRanks();
  renderCards(listings);
})();
`;
  return listingsStr + clientJs;
}

/* ══════════ MAIN EXECUTION ══════════ */
(function main(){
  console.log("=== Neon Blue Night Sub-site Builder ===");

  // Read venues
  var venues = JSON.parse(fs.readFileSync(path.join(ROOT,"venues.json"),"utf8"));
  console.log("Loaded "+venues.length+" venues");

  // Use English slugs from venues.json (or fallback to Korean)
  venues.forEach(function(v){
    if(v.slug) {
      v._slug = v.slug;
    } else {
      var rawSlug = makeSlug(v.name, v.region);
      v._slug = dedupeSlug(rawSlug, v.region);
    }
    v._fullName = v.name;
  });

  // QA
  var errors = qa(venues);
  if(errors.length){
    console.error("QA ERRORS:");
    errors.forEach(function(e){console.error("  "+e);});
    process.exit(1);
  }
  console.log("QA passed");

  // Clean up old directories
  var vDir = path.join(ROOT,"v");
  var cDir = path.join(ROOT,"c");
  if(fs.existsSync(vDir)){fs.rmSync(vDir,{recursive:true,force:true});console.log("Cleaned /v/");}
  if(fs.existsSync(cDir)){fs.rmSync(cDir,{recursive:true,force:true});console.log("Cleaned /c/");}

  // Generate main.js
  var mainJs = generateMainJs(venues);
  fs.writeFileSync(path.join(ROOT,"main.js"), mainJs, "utf8");
  console.log("Generated main.js");

  // Generate detail pages + OG SVGs
  venues.forEach(function(v, idx){
    var slugDir = path.join(ROOT,"v",v._slug);
    fs.mkdirSync(slugDir, {recursive:true});

    // OG SVG
    fs.writeFileSync(path.join(slugDir,"og.svg"), generateOgSvg(v), "utf8");

    // Content
    var content = generateContent(v, idx);

    // Detail HTML
    fs.writeFileSync(path.join(slugDir,"index.html"), generateDetailHtml(v, v._slug, content, idx), "utf8");
  });
  console.log("Generated "+venues.length+" detail pages + OG SVGs");

  // Generate category pages
  var catMap = {};
  CATEGORIES.forEach(function(cat){catMap[cat.name]=[];});
  venues.forEach(function(v){
    var catSlug = getCategorySlug(v.type);
    if(catMap[catSlug])catMap[catSlug].push(v);
  });
  Object.keys(catMap).forEach(function(catName){
    if(!catMap[catName].length)return;
    var catDir = path.join(ROOT,"c",catName);
    fs.mkdirSync(catDir,{recursive:true});
    fs.writeFileSync(path.join(catDir,"index.html"), generateCategoryHtml(catName, catMap[catName]), "utf8");
  });
  console.log("Generated category pages");

  // Generate extra pages (map, ranking, magazine, gallery, events)
  var extraDir = path.join(ROOT,"pages");
  fs.mkdirSync(extraDir,{recursive:true});
  var extraPages = generateExtraPages(venues);
  extraPages.forEach(function(p){
    var d=path.join(ROOT,p.dir||"pages");
    fs.mkdirSync(d,{recursive:true});
    fs.writeFileSync(path.join(d,p.file), p.html, "utf8");
  });
  console.log("Generated extra pages (map/ranking/magazine/events)");

  // Generate interactive pages (quiz, safety, dresscode)
  var interDir = path.join(ROOT,"interactive");
  fs.mkdirSync(interDir,{recursive:true});
  var interPages = generateInteractivePages(venues);
  interPages.forEach(function(p){ fs.writeFileSync(path.join(interDir,p.file), p.html, "utf8"); });
  console.log("Generated interactive pages");

  // Generate community pages
  var communityDir = path.join(ROOT,"community");
  fs.mkdirSync(communityDir,{recursive:true});
  var commPages = generateCommunityPages(venues);
  commPages.forEach(function(p){ fs.writeFileSync(path.join(communityDir,p.file), p.html, "utf8"); });
  console.log("Generated community pages");

  // Generate sitemap
  var today = new Date().toISOString().slice(0,10);
  var sitemapUrls = ['<url><loc>'+DEPLOY_URL+'/</loc><lastmod>'+today+'</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>'];
  CATEGORIES.forEach(function(cat){
    if(catMap[cat.name]&&catMap[cat.name].length){
      sitemapUrls.push('<url><loc>'+DEPLOY_URL+'/c/'+encodeURI(cat.name)+'/</loc><lastmod>'+today+'</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>');
    }
  });
  venues.forEach(function(v){
    sitemapUrls.push('<url><loc>'+DEPLOY_URL+'/v/'+encodeURI(v._slug)+'/</loc><lastmod>'+today+'</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>'+
      '<image:image><image:loc>'+DEPLOY_URL+'/v/'+encodeURI(v._slug)+'/og.svg</image:loc><image:title>'+escapeXml(v.name)+'</image:title></image:image></url>');
  });
  var sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+sitemapUrls.join("\n")+'\n</urlset>';
  fs.writeFileSync(path.join(ROOT,"sitemap.xml"), sitemap, "utf8");
  console.log("Generated sitemap.xml ("+sitemapUrls.length+" URLs)");

  // Generate RSS
  var rssItems = venues.map(function(v){
    return '<item><title>'+escapeXml(v.name)+'</title><link>'+DEPLOY_URL+'/v/'+encodeURI(v._slug)+'/</link>'+
      '<description>'+escapeXml(v.hook.replace(/\n/g," ")+" "+v.value)+'</description>'+
      '<pubDate>'+new Date().toUTCString()+'</pubDate></item>';
  });
  var rss = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'+
    '<title>도시의 밤을 지배하라 — 전국 나이트·클럽·라운지</title>'+
    '<link>'+DEPLOY_URL+'/</link>'+
    '<description>전국 나이트·클럽·라운지 19곳 완벽 가이드</description>'+
    '<language>ko</language>\n'+rssItems.join("\n")+'\n</channel></rss>';
  fs.writeFileSync(path.join(ROOT,"rss.xml"), rss, "utf8");
  console.log("Generated rss.xml");

  // Generate _redirects — old Korean slugs → new English slugs (301)
  var redirectLines = [];
  venues.forEach(function(v){
    if(v.slug) {
      // Generate old Korean slug for redirect
      var rawSlug = makeSlug(v.name, v.region);
      var oldSlug = dedupeSlug(rawSlug, v.region);
      if(oldSlug !== v.slug) {
        redirectLines.push("/v/"+encodeURI(oldSlug)+"/* /v/"+v.slug+"/:splat 301");
      }
    }
  });
  fs.writeFileSync(path.join(ROOT,"_redirects"), redirectLines.join("\n")+"\n", "utf8");

  // Update robots.txt
  var robots = 'User-agent: *\nAllow: /\nCrawl-delay: 1\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: Yeti\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nSitemap: '+DEPLOY_URL+'/sitemap.xml\n';
  fs.writeFileSync(path.join(ROOT,"robots.txt"), robots, "utf8");
  console.log("Updated robots.txt");

  console.log("=== BUILD COMPLETE: "+venues.length+" venues ===");
})();
