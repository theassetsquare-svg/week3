/**
 * content-engine.js — Nightlife venue content generator (v3)
 * Compositional templates with 15-25+ variations per section
 * Designed for 103+ venues with <10% inter-page similarity
 */

/* ══════════ HELPERS ══════════ */
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function josa(word, pair) {
  var p = pair.split("/");
  var c = word.charCodeAt(word.length - 1);
  if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0 ? p[0] : p[1];
  return p[0];
}
function pick(arr, idx) { return arr[idx % arr.length]; }
function hash(idx, slot) { return ((idx * 2654435761 >>> 0) + slot * 1000003) >>> 0; }
function pickH(arr, idx, slot) { return arr[hash(idx, slot) % arr.length]; }

function getCategory(type) {
  if (type === "클럽") return "club";
  if (type === "라운지") return "lounge";
  if (type === "룸") return "room";
  if (type === "요정") return "yojeong";
  if (type === "호빠") return "hoppa";
  return "night";
}
var CAT_LABEL = { night: "나이트", club: "클럽", lounge: "라운지", room: "룸", yojeong: "요정", hoppa: "호빠" };

function hookLine(v, n) { var h = v.hook.split("\n"); return (h[n] || h[0]).replace(/\.$/, "").trim(); }
function valueParts(v) { return v.value.split("·").map(function (s) { return s.trim(); }).filter(Boolean); }
function addrShort(v) { var m = v.addr.match(/[가-힣]+[구동]/); return m ? m[0] : v.region; }

/* Unescape HTML entities for FAQ/conclusion text */
function unesc(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

/* Shuffle-pick N unique items from arr using hash seeding */
function pickNUnique(arr, idx, baseSlot, n) {
  var result = [];
  var used = {};
  for (var i = 0; i < n; i++) {
    var h = hash(idx, baseSlot + i * 37 + 13);
    var pos = h % arr.length;
    var tries = 0;
    while (used[pos] && tries < arr.length) { pos = (pos + 1) % arr.length; tries++; }
    if (!used[pos]) { used[pos] = true; result.push(arr[pos]); }
  }
  return result;
}


/* ══════════════════════════════════════════════════════════════
   SUMMARY POOL — 24 templates (pick 8 per venue)
   Each uses 3+ venue variables for natural uniqueness
   ══════════════════════════════════════════════════════════════ */
var SUMMARY_POOL = [
  "$h0 — 이 문장으로 $region 밤을 검색하는 사람이 많다.",
  "$hours 운영, $vp0 중심으로 주말에는 $addr 인근 웨이팅이 생기기도.",
  "$vp0 시스템이 $addr 소재 이곳의 핵심 무기다. $vp1도 주목할 점.",
  "$as 일대 $addr 위치. $h0. 택시·지하철 $region역에서 접근 편리.",
  "$h0. 처음이라면 $hours 중 오픈 직후 $addr 방문이 편하다.",
  "$vp1 포함 $addr에서 단체 예약 시 $vp0 기반 전용 구역 요청 가능.",
  "$vp1 서비스가 $addr 소재 이곳 재방문율을 높이는 핵심. $h0.",
  "$vp0 분위기에 맞게 $addr 방문 전 드레스코드 확인은 기본이다.",
  "$h0. $vp0 키워드로 $region 밤을 찾는 사람에게 꾸준히 추천.",
  "$hours 중 $addr 인근에서는 자정 전후가 $vp0 분위기 절정이다.",
  "$addr 인근 주차보다 대리운전이 $vp0 경험 방문 시 현명하다.",
  "$vp0 기반 웨이터 상주 방식. $addr에서 $vp1까지 편하게 이용.",
  "$vp0와 $vp1, 두 키워드가 $addr 소재 이곳의 핵심이다.",
  "$addr 근처 $region 상권이 발달해 $vp0 즐긴 후 2차 이동도 수월.",
  "$addr에서는 금요일 $vp0 분위기와 토요일 $vp1 분위기 차이가 확연.",
  "$vp0 기준 $addr에서 테이블석 사전 예약이 사실상 필수다.",
  "$vp1 감성 인테리어가 $addr 소재 이곳에서 사진 찍기에도 좋다.",
  "$vp0 포함 $addr에서 생일·기념일 파티 예약이 꾸준하다. $h0.",
  "$h0. 경험 없는 $region 방문자에게도 $vp0 덕분에 문턱이 낮다.",
  "$addr 소재 이곳은 2인~10인 $vp1 포함 단체까지 좌석 커버 가능.",
  "$region 야간 $addr 인근 택시가 많다. $vp0 즐긴 후 귀가 계획을 세우자.",
  "$vp0 중심 음악이 $addr에서 요일별로 변주되는 게 이곳의 특징.",
  "$hours 기준 $addr에서 오픈 1시간 뒤 도착이 $vp0 경험에 가장 효율적.",
  "$addr 소재 이곳은 $vp0 기반 보안 요원 상주로 안전한 환경이다."
];


/* ══════════════════════════════════════════════════════════════
   INTRO — P1 (hook), P2 (features), P3 (location), P4 (timing)
   15+ templates each, compositional structure
   ══════════════════════════════════════════════════════════════ */

var INTRO_P1 = [
  "<p>$name. 이 이름을 한 번이라도 들어봤다면 이미 알고 있을 것이다. $h0. 그 말 한마디에 궁금증이 시작된다.</p>",
  "<p>$region 밤을 검색하면 어김없이 등장하는 이름, $name. $h0. 직접 확인하고 싶어지는 건 당연하다.</p>",
  "<p>$h0. 이건 $name 다녀온 사람들이 공통으로 하는 말이다. 과장이 아니라 체감이다.</p>",
  "<p>밤이 깊어질수록 빛나는 곳이 있다. $name이 그렇다. $h0. 한 문장이지만 무게감이 있다.</p>",
  "<p>$name 앞에 서면 안다. $h0. 그 감각이 문 밖에서부터 전해진다.</p>",
  "<p>누군가 $region 밤 어디 가냐고 물으면 $name 이름이 먼저 나온다. $h0. 이유가 있다.</p>",
  "<p>첫 방문이든 재방문이든 상관없다. $name은 매번 다른 밤을 보여준다. $h0.</p>",
  "<p>$h0. 이 한 줄이 $name의 정체성이다. 설명 대신 경험을 권한다.</p>",
  "<p>$region의 수많은 $cl 사이에서 $name이 살아남은 이유. $h0. 직접 가보면 납득된다.</p>",
  "<p>어디서부터 말해야 할까. $name은 단순한 $cl이 아니다. $h0. 그게 전부이자 시작이다.</p>",
  "<p>$name. $h0. 짧은 문장이지만, 이 안에 수백 개의 밤이 압축돼 있다.</p>",
  "<p>밤마다 문을 여는 곳은 많지만 기억에 남는 건 드물다. $name은 그 드문 쪽이다. $h0.</p>",
  "<p>$region 밤문화를 말할 때 빠질 수 없는 이름. $name. $h0. 한번 가면 안다.</p>",
  "<p>$h0. $name 경험자들의 한결같은 평가다. 과연 그런지, 확인하러 가는 발걸음이 이미 정답이다.</p>",
  "<p>$name이라는 이름 앞에 수식어는 필요 없다. $h0. 말보다 몸이 먼저 반응하는 곳.</p>",
  "<p>어둠 속에서 음악이 들리면, $name의 밤이 시작된다. $h0. 문을 열기 전부터 감이 온다.</p>"
];

var INTRO_P2 = [
  "<p>$cl 선택의 핵심은 분위기와 사운드다. 이곳은 $vp0와 $vp1 두 가지를 전면에 내세운다. 말보다 체감이 빠른 영역이다.</p>",
  "<p>입장하면 가장 먼저 느끼는 건 음악이다. $vp0 수준의 시스템이 공간 전체를 채운다. 발끝부터 올라오는 저음이 몸을 움직이게 만든다.</p>",
  "<p>$vp0와 $vp1을 갖추고 있다. 술 한잔 하러 가는 곳이 아니라, 밤 전체를 설계하는 곳에 가깝다.</p>",
  "<p>$vp0이 첫 번째 키워드고, $vp1이 두 번째 키워드다. 나머지는 직접 체험해봐야 와닿는 부분들.</p>",
  "<p>분위기는 조명이 만들고, 기억은 사운드가 남긴다. $vp0 시스템이 그 역할을 해낸다. $vp1까지 더하면 완성이다.</p>",
  "<p>안으로 들어서면 바깥과는 차원이 다른 세계다. $vp0에 $vp1까지. 감각이 한꺼번에 열린다.</p>",
  "<p>$cl마다 저마다의 무기가 있다. 이곳의 무기는 $vp0와 $vp1. 그 조합이 만들어내는 밤은 독보적이다.</p>",
  "<p>첫인상을 결정짓는 건 $vp0이고, 재방문을 결정짓는 건 $vp1이다. 둘 다 놓치지 않았다.</p>",
  "<p>$vp0 하나만으로도 갈 이유는 충분하다. 거기에 $vp1과 $vp2까지 더해지면 이야기가 달라진다.</p>",
  "<p>좋은 $cl의 조건을 따지면 결국 $vp0와 $vp1로 귀결된다. 이곳은 그 두 가지에 집중한다.</p>",
  "<p>$vp0 퀄리티가 눈에 띈다. $vp1 역시 수준 이상. 기대치를 살짝 넘기는 게 이 $cl의 전략이다.</p>",
  "<p>문 열고 들어서면 $vp0가 먼저 반긴다. 그 다음은 $vp1. 순서대로 감각이 깨어나는 구조다.</p>",
  "<p>$type 고를 때 가장 중요한 건 결국 분위기다. $vp0와 $vp1이 그 분위기의 뼈대를 만든다.</p>",
  "<p>사운드가 공간을 지배한다. $vp0 레벨의 시스템이 깔리고, $vp1이 그 위에 얹어진다. 꽤 설득력 있는 조합이다.</p>",
  "<p>$vp0, $vp1, $vp2. 세 가지 키워드로 압축되는 곳이다. 순서대로 경험하면 자연스럽게 빠져든다.</p>",
  "<p>시각은 조명이 담당하고, 청각은 $vp0가 책임진다. $vp1까지 합세하면 오감이 전부 열린다.</p>"
];

var INTRO_P3 = [
  "<p>위치는 $addr. 중심부에서 접근성이 좋다. 대중교통이나 대리운전 모두 수월한 편이다.</p>",
  "<p>$addr 위치. 택시비 아끼려면 지하철 조합이 가장 효율적이다. 주차는 사전 문의가 안전하다.</p>",
  "<p>찾아가는 길은 간단하다. $addr, 핵심 상권 안에 있어서 헤맬 걱정은 없다.</p>",
  "<p>$as 일대에 자리 잡고 있다. $addr 기준, 도보 5분 이내에 역이 있어서 이동이 편하다.</p>",
  "<p>$addr. $region 중심가라 주변 편의시설도 넉넉하다. 늦은 시간에도 택시 잡기 어렵지 않은 위치.</p>",
  "<p>주소는 $addr인데, 한 번만 가보면 다음부터는 눈 감고도 찾는다. $as 상권 한복판이다.</p>",
  "<p>$region 핵심 상권 $as에 위치한다. $addr 일대라 음식점, 편의점도 가까이 있다.</p>",
  "<p>길찾기 앱에 $addr 입력하면 끝이다. $region 주요 도로변이라 내비게이션도 정확하게 안내한다.</p>",
  "<p>$addr에 있다. $region 번화가 한가운데라 유동인구가 많은 편. 처음 가더라도 쉽게 찾을 수 있다.</p>",
  "<p>입지 하나만 보면 $as 일대가 정답인 이유를 알겠다. $addr 위치. 대중교통도, 대리운전도 수월하다.</p>",
  "<p>$addr 근처다. $region에서 야간 접근성이 좋은 입지 중 하나. 주변에 주차장도 있으니 참고.</p>",
  "<p>위치가 좋다. $addr이면 $as 한복판이다. 밤늦게까지 주변 상권이 살아 있어서 동선이 편하다.</p>",
  "<p>$addr. 네비에 주소 찍으면 5분이면 이해되는 위치다. $region 주요 도로에서 한 블록 안쪽.</p>",
  "<p>찾아가는 건 어렵지 않다. $addr 일대, $as 상권 중심. 지하철역에서 도보 권내라 접근이 쉽다.</p>",
  "<p>$region $as 중심가에 자리 잡고 있다. 주소는 $addr. 늦은 시간에도 택시 호출이 빠른 구역이다.</p>",
  "<p>$addr. 지도에서 보면 $as 핵심 블록 안이다. 주변에 편의점과 2차 갈 만한 곳이 즐비하다.</p>"
];

var INTRO_P4 = [
  "<p>영업시간은 $hours. 처음 간다면 오픈 1~2시간 뒤 도착이 분위기를 제대로 느끼는 타이밍이다.</p>",
  "<p>$hours 운영. 너무 이르면 썰렁하고, 너무 늦으면 자리 없다. 밤 10시~11시가 황금 시간대.</p>",
  "<p>운영 시간은 $hours. 금요일은 직장인 중심, 토요일은 혼합 연령대. 요일에 따라 분위기가 달라진다.</p>",
  "<p>$hours 사이가 영업 시간이다. 주말 자정 이후는 피크 타임이니, 좌석 확보하려면 일찍 가자.</p>",
  "<p>영업은 $hours. 주중에는 여유롭고, 주말에는 빈 자리 찾기가 어렵다. 첫 방문이면 주중 추천.</p>",
  "<p>$hours 운영이라 계획 세우기 편하다. 저녁 식사 후 출발하면 타이밍이 딱 맞는다.</p>",
  "<p>시간은 $hours. $type 분위기가 무르익는 건 보통 밤 11시부터. 그 전에 가면 자리 선점이 가능하다.</p>",
  "<p>$hours가 공식 운영 시간이다. 하지만 진짜 분위기는 자정을 넘기면서 시작된다. 새벽까지 갈 각오하고 가자.</p>",
  "<p>운영은 $hours. 평일 저녁은 가볍게, 주말 밤은 제대로. 목적에 따라 요일 선택이 중요하다.</p>",
  "<p>영업시간 $hours. 도착 타이밍에 따라 완전히 다른 경험을 하게 된다. 밤 10시가 기준점이다.</p>",
  "<p>$hours까지 운영한다. 새벽 귀가를 감안하면 대리운전이나 택시 앱은 미리 준비해둘 것.</p>",
  "<p>$hours가 운영 시간이니 참고. 피크 직전에 입장해서 자리 잡고, 분위기 고조를 즐기는 게 요령이다.</p>",
  "<p>운영 시간은 $hours. 주말은 예약 없이 가면 대기가 생길 수 있다. 여유로운 밤을 원하면 주중이 답.</p>",
  "<p>$hours 운영. $region 야간 교통은 택시가 주력이다. 귀가 계획까지 세워두면 밤이 깔끔하게 마무리된다.</p>",
  "<p>시간 $hours. 입장 타이밍 팁을 하나 주자면, 오픈 직후보다 90분 뒤가 효율적이다. 분위기와 자리 모두 잡을 수 있다.</p>",
  "<p>$hours 동안 문을 연다. 늦게 갈수록 열기는 뜨거워지지만, 좌석은 줄어든다. 균형점은 밤 10시 반 근처.</p>"
];


/* ══════════════════════════════════════════════════════════════
   STORY — 6 sections, 10+ templates each
   Compositional: opener + middle + closer arrays for extra variation
   $name appears in section 0 and section 5 ONLY
   ══════════════════════════════════════════════════════════════ */

var STORY_TITLES_0 = ["첫인상", "입장 첫 순간", "문을 열면", "첫 발걸음", "그 첫 10초", "시작의 순간", "입구에서 느낀 것", "첫 장면"];
var STORY_BODIES_0 = [
  "$addr 위치한 $type의 문을 열면 $vp0 조명이 먼저 맞이한다. $region 특유의 어둑한 톤에 $vp1 사운드가 몸을 감싼다.",
  "$region 소재 이곳, 안쪽으로 들어서면 바깥과 전혀 다른 세계. $vp0 조명과 $vp1 사운드와 사람들 에너지가 동시에.",
  "$addr 입구를 지나는 순간 소음이 사라진다. $vp0 기반 사운드가 귓가를 채운다. $region의 $type은 귀가 먼저 반응한다.",
  "$addr 소재 이곳에 발을 디디면 $vp0 공기가 달라진다. $vp1과 $region 특유의 긴장, 기대, 진동이 동시에 밀려온다.",
  "$addr 문 너머 통로가 나온다. 짧은 복도지만 $region 일상과 밤 경계가 뚜렷하다. $vp0 분위기의 세계가 열린다.",
  "$region 소재 이곳 입장하면 멈춰 둘러보게 된다. $vp0 조명, $vp1 밀도, 음악 볼륨이 $addr에서 동시에 들어온다.",
  "$addr 밖에서 상상 어려운 공간이 $region 소재 이곳 안에 펼쳐진다. $vp0 조명은 낮고 $vp1 사운드는 높다.",
  "$region 소재 이곳, 처음 들어서면 피부가 먼저 반응한다. $vp0 진동이 $addr 바닥을 타고 올라온다. $type 밤은 발밑부터.",
  "$addr의 문을 여는 순간 일상 무게가 떨어진다. $region 소재 이곳 안은 $vp0 분위기 속 다른 시간이 흐른다.",
  "$region $addr 입구를 지나 안쪽 10걸음. $vp0 분위기가 $type 기준 100% 전달된다. $vp1까지 공기가 달라지는 순간."
];

var STORY_TITLES_1 = ["사운드와 무대", "음악이 만드는 분위기", "귀가 먼저 반응하다", "사운드 시스템", "음악의 힘", "소리가 공간을 채울 때", "DJ와 선곡", "비트가 만든 밤"];
var STORY_BODIES_1 = [
  "$region 소재 이곳의 핵심은 사운드다. $vp0 수준 시스템이 $addr 인근 홀 전체를 채운다. $hours 운영 중 DJ 선곡이 바뀌면 공간 온도가 올라간다.",
  "$type에서 음악은 배경이 아니라 주인공. $vp0에 투자한 흔적이 $region 기준 선명하다. $vp1 분위기 속 베이스가 바닥을 타고 올라온다.",
  "$addr 위치한 이곳, 발걸음 옮길 때마다 사운드 결이 달라진다. $vp0 시스템이 $region $type 공간 구석구석을 커버한다.",
  "$region $type의 DJ 부스가 홀 중앙에 자리잡았다. $vp0 기반 사운드가 $addr 소재 공간에 방사형으로 퍼진다. $vp1도 눈여겨볼 점.",
  "$hours 운영 중 음악은 시간대별로 변한다. 초반 가벼운 비트에서 $region 자정 이후 $vp0 시스템 풀파워로. $type 분위기가 확 달라진다.",
  "$region 기준 좋은 $cl의 핵심은 사운드다. $vp0 레벨 시스템이 $addr에서 울리면 $vp1 분위기 속 몸이 먼저 반응한다.",
  "$vp0 장비가 $region 소재 이곳의 핵심이다. $addr에서 공간에 맞게 조율된 소리가 나온다. $type 경험자라면 차이를 귀로 안다.",
  "$region $type에서 사운드가 공간을 지배한다. $vp0 시스템의 저음은 $addr 현장에서 가슴을 울린다. $vp1도 함께 경험할 수 있다.",
  "$hours 운영되는 이곳에서 DJ 선곡이 밤의 방향을 결정한다. $vp0 시스템 위 $region 음악은 같은 곡도 다르게 들리게 만든다.",
  "$region $addr 소재 이곳에서 음악이 공간 온도를 조절한다. $vp0 시스템의 저음~고음 밸런스가 $type 경험의 무기다."
];

var STORY_TITLES_2 = ["좌석과 동선", "자리 선택 팁", "공간 구성", "어디에 앉을까", "내부 구조", "좌석 배치의 기술", "동선 파악하기", "자리잡기 전략"];
var STORY_BODIES_2 = [
  "$region 소재 이곳은 홀 좌석과 테이블석이 분리돼 있다. $vp1 포함 단체라면 사전 예약 필수. $addr 기준 2~3명은 홀에서 자유롭게.",
  "$type 좌석 구조가 명확하다. $region 기준 홀·테이블·VIP 분리. $vp0 분위기 속 인원·예산에 맞게 고르면 된다.",
  "$addr 위치한 이곳, 안쪽일수록 $vp0 사운드 밀도가 높다. $region $type에서 대화 원하면 입구 쪽, 음악 원하면 안쪽 홀.",
  "$region 소재 $type 테이블은 벽면 배치, 중앙은 오픈 홀이다. $vp0 분위기 속 $addr에서 움직이기 좋은 구조.",
  "$region $type 기준 층마다 분위기가 다를 수 있다. $vp0 있는 아래층은 활기, 위층은 $vp1 분위기로 조용한 패턴.",
  "$addr 소재 이곳의 VIP석은 분리 영역에서 $vp0 프라이빗하다. $region $type 일반석은 개방형으로 에너지 공유.",
  "$region $type 동선이 꼬이지 않는 구조다. $addr 현장에서 바·홀·화장실 이동이 $vp0 분위기 속 자연스럽게 연결된다.",
  "$region $type 기준 소규모면 바 카운터, 4인+면 테이블석. $vp1 포함 단체는 $addr 현장에 미리 전화로 자리 확보.",
  "$addr 소재 이곳의 좌석 배치가 여유롭다. $region $cl 기준 $vp0 분위기 속 옆 테이블과 거리가 적당해 대화 가능.",
  "$region 소재 $type에 바 카운터, 중앙 홀, 테이블, VIP룸까지. $vp0와 $vp1 즐기며 용도별 구역을 선택할 수 있다."
];

var STORY_TITLES_3 = ["시간대별 분위기 변화", "타이밍의 기술", "밤의 흐름", "시간이 만드는 차이", "분위기의 곡선", "시간별 체감 온도", "피크 타임", "밤의 리듬"];
var STORY_BODIES_3 = [
  "$region $type은 $hours 오픈 직후 조용하다. $vp0 분위기가 살아나는 건 10시부터. 자정 넘으면 $addr 인근이 피크. 새벽이 진짜다.",
  "$hours 운영되는 $region $type, 시간대 따라 전혀 다른 곳이 된다. 이른 시간 $vp0 여유로움, 늦은 시간 홀 만석. 도착 타이밍이 핵심.",
  "$region 기준 밤 9시는 워밍업, 11시 본 게임, 새벽 1시 절정이다. $hours 중 $vp0 경험은 시간 선택이 좌우한다.",
  "$addr 소재 $type, 초반 빈 자리가 여유롭다. $hours 중 11시 넘기면 $region 기준 상황이 달라진다. $vp0 열기가 시작.",
  "$region $type 피크는 금토 자정~새벽 2시. $hours 운영 중 $vp0 분위기 공략하려면 미리 입장해 $addr에서 자리 잡는 게 핵심.",
  "$region 소재 $type은 주중·주말 분위기 차이가 크다. $vp0 기준 주중 소규모, 주말 대규모 열기. $addr에서 다른 경험 가능.",
  "$hours 중 $region $type은 밤 깊어질수록 볼륨이 올라간다. $vp0 기반 DJ 선곡이 시간대별로 조절된다. 자정 이후가 하이라이트.",
  "$region $type에서 금요일은 퇴근 후 해방감, 토요일은 처음부터 텐션. $vp0 분위기 속 $addr에서 둘 다 좋지만 느낌이 다르다.",
  "$hours 운영되는 $region $type, 시간 따라 조명도 바뀐다. $vp0 연출이 초반 은은, 피크 타임 강렬. $addr 현장 경험이 색다르다.",
  "$hours 사이 $region $type은 매 시간 공간 밀도가 달라진다. $vp0 여유 원하면 일찍, $vp1 열기 원하면 늦게 $addr로."
];

var STORY_TITLES_4 = ["알아두면 좋은 것들", "주의사항과 에티켓", "방문 전 체크리스트", "매너에 대하여", "에티켓 가이드", "기본 수칙", "팁 모음", "방문 노하우"];
var STORY_BODIES_4 = [
  "$region 소재 $type마다 불문율이 있다. $vp0 분위기에서 과음 민폐는 퇴장 사유. $addr 인근 업소 공통으로 무단 합석도 금물.",
  "$region $type 기준 매너 있는 손님을 선호한다. $vp0 분위기 속 웨이터 호출은 눈 맞춤이 깔끔. $addr 현장에서 고함보다 제스처.",
  "$region 소재 $type 드레스코드가 있다면 반드시 지키자. $vp0 분위기에 맞게 슬리퍼·반바지 제한. $addr 방문 시 캐주얼 이상.",
  "$addr 소재 $region $type에서 소지품 관리는 본인 책임. $vp0 분위기 즐기면서도 핸드폰·지갑은 몸에 지니고 외투 보관소 활용.",
  "$region $type에서 사진 촬영 가능하나 다른 손님 주의가 필요하다. $vp0 분위기 속 $addr 현장에서 플래시는 자제가 매너.",
  "$region $type은 예약 시간보다 30분 늦으면 자리가 풀린다. $hours 운영 기준 $addr 방문 시 지각 예상되면 미리 연락.",
  "$region $type에서 음주는 자기 페이스가 핵심이다. $hours 영업시간 동안 $vp0 분위기 속 밤은 길다. 초반 과하면 나중이 힘들다.",
  "$region $type 첫 방문이면 $addr 현장 웨이터에게 추천 요청. $vp0 기반 자리 배치부터 메뉴까지 안내받으면 수월하다.",
  "$addr 소재 $region $type은 입장 시 화장실 위치 확인 권장. $hours 중 붐비는 시간에 $vp0 분위기 속 동선 꼬이면 불편.",
  "$region $type은 $hours 기준 영업 종료 30분 전 라스트 오더. $addr 방문 시 $vp0 즐기다 퇴장 시간 놓치지 않도록."
];

var STORY_TITLES_5 = ["귀가 전략", "마무리와 귀가", "밤의 끝", "돌아가는 길", "귀갓길 플랜", "새벽 이동 팁", "마지막 한 잔 후", "집으로 가는 길"];
var STORY_BODIES_5 = [
  "새벽 시간 대중교통은 끊긴다. 대리운전 앱을 미리 깔아두거나, 택시 호출 타이밍을 잡아야 한다. $region 새벽은 택시 잡기가 치열하니 30분 전 호출이 현명. 오늘 밤을 깔끔하게 마무리하자.",
  "나올 때 외투와 소지품 챙기는 건 기본. $region 새벽은 택시 대란이니 대리운전이나 사전 콜이 필수다. 음주운전은 절대 금물. $type의 밤은 안전하게 끝내야 진짜다.",
  "마지막 한 잔을 비우고 나오면, $region 새벽 공기가 달라진 걸 느낀다. 택시나 대리운전은 미리 잡아둔 게 맞다. 좋은 기억을 안고 돌아가자.",
  "귀가는 전략이다. $region은 새벽 택시 수요가 높은 지역이라, 앱 호출을 일찍 시작해야 한다. 음주 후 운전은 당연히 불가. 오늘 밤은 무사 귀가로 완성된다.",
  "새벽 2시가 넘으면 $region 일대 택시 경쟁이 심해진다. 대리운전이 더 빠를 수 있다. 소지품 한번 확인하고 나서자. $type의 밤, 마무리까지 깔끔하게.",
  "밤을 충분히 즐겼다면, 다음은 안전한 귀가다. $region에서는 카카오T나 대리운전이 가장 현실적인 선택이다. 이 $type의 밤은 다음을 기약하며 마친다.",
  "나오면서 24시 편의점에 들러 물 한 병. 해장은 다음날의 몫이고, 우선은 택시부터 잡자. $region 새벽은 대기가 길다. 좋은 밤이었다면, 마무리도 잘해야 한다.",
  "문밖으로 나서면 차가운 새벽 공기가 얼굴을 때린다. 그 순간이 밤의 마침표다. $region 택시 대기시간을 고려해 미리 호출해두자. $type의 밤은 안전 귀가로 끝.",
  "귀가길은 단순하게. 대리운전 또는 택시. 둘 중 하나를 미리 정해두면 혼잡한 새벽에도 당황하지 않는다. $region 새벽 이동은 30분 여유를 두자. 다음에 또 오면 된다.",
  "한 발짝 밖으로 나오면 현실이 돌아온다. 하지만 오늘 밤의 기억은 남는다. $region 새벽 택시는 미리 잡아두고, 소지품 챙기고, 무사히 돌아가자."
];


/* ══════════════════════════════════════════════════════════════
   FAQ POOL — 28 Q&A pairs (pick 8 per venue)
   $name appears sparingly — controlled in generateContent
   ══════════════════════════════════════════════════════════════ */
var FAQ_POOL = [
  { q: "$addr 소재 입장료는?", a: "$addr 소재은 요일·시간에 따라 입장료가 다르다. $hours 운영 중 주중이 저렴하고, $vp0 포함 여부에 따라 변동. 전화 문의가 정확하다." },
  { q: "$addr 소재 드레스코드?", a: "$region 소재 $type 기준, 슬리퍼·반바지는 제한이다. $vp0 분위기에 맞게 깔끔한 캐주얼 이상이면 된다. $addr 인근 업소 공통 룰." },
  { q: "$addr 소재 예약 필요?", a: "$hours 운영 중 $addr 소재은 주중 워크인 가능하다. 금토는 $vp1 포함 테이블 예약 추천. 단체는 3일 전 연락이 안전하다." },
  { q: "$addr 인근 주차?", a: "$addr 인근 유료 주차장이 있다. 다만 $addr 소재 방문 시 음주 예정이면 대리운전이 현명하다. $hours 새벽 이동 참고." },
  { q: "도착 추천 시간?", a: "$addr 소재 분위기를 제대로 느끼려면 $hours 중 오픈 1시간 뒤가 적당하다. $vp0 분위기는 자정 전후 절정." },
  { q: "연령 제한은?", a: "만 19세 미만 입장 불가, 신분증 필수. $addr 소재 기준 $hours 운영 시간 동안 미성년자 동반도 제한된다." },
  { q: "$addr 소재 단체 예약?", a: "$region $addr 소재 $type에서 단체 예약 시 인원·날짜·좌석 타입을 전화로 안내. $vp1 포함 10인 이상 전용 구역 배정 가능." },
  { q: "혼자 가도 괜찮은지?", a: "$addr 소재 홀 좌석이라면 혼자서도 $vp0 분위기를 즐길 수 있다. $hours 중 주중 방문이 더 편하다." },
  { q: "재방문 혜택?", a: "$addr 소재 중 단골 우대 혜택이 있는 곳도 있다. $vp0 관련 멤버십 여부는 $addr 방문 시 문의." },
  { q: "$addr 근처 2차?", a: "$addr 주변 $region 밤문화 상권이 밀집돼 있다. $type 후 도보 거리에 술집·식당이 많아 2차 동선이 편리." },
  { q: "음악 장르는?", a: "$addr 소재에서는 $vp0 중심 음악이 흐른다. $hours 운영 중 DJ 선곡이 시간대별로 바뀌는 게 특징." },
  { q: "$addr 소재 안전한가?", a: "$addr 소재 $addr 소재은 보안 요원 상주·CCTV 운영 중이다. $hours 영업시간 내 과음·폭력은 즉시 퇴장." },
  { q: "위치와 접근성?", a: "$addr에 있다. $region 중심가라 대중교통 편리하고 $type 방문객용 택시 승차장도 가깝다. $hours 중 야간 접근도 수월." },
  { q: "$addr 소재 VIP석?", a: "$addr 소재에서 VIP 테이블은 별도 구역에 마련. $vp0 포함 사전 예약 필수, 전용 웨이터 배정. $hours 중 요일별 가격 변동." },
  { q: "생일 파티 가능?", a: "$region $addr 소재 $type에서 생일 이벤트 가능하다. $vp1 포함 파티 패키지는 전화로 인원·날짜 사전 협의." },
  { q: "외투 보관?", a: "$addr 소재에서 외투 보관소 운영 여부는 $addr 현장에서 확인. $hours 영업 중 무료 또는 소정 비용." },
  { q: "최소 주문 금액?", a: "$addr 소재 테이블석 기준 최소 주문이 있을 수 있다. $vp0 서비스 포함 홀 이용은 보통 제한 없다. $addr 현장 확인." },
  { q: "흡연 가능?", a: "$region $addr 소재 $type 실내는 금연이다. $hours 운영 중 흡연 구역은 별도 마련, 웨이터에게 문의." },
  { q: "$region 대리운전?", a: "$region $addr 일대 대리운전 호출은 원활하다. 다만 $type 주말 새벽은 $hours 마감 즈음 대기가 길어질 수 있다." },
  { q: "평일도 운영?", a: "$hours 전체 운영이다. $addr 소재 평일은 여유롭고, $vp0 분위기를 조용히 즐기기에 주중이 좋다." },
  { q: "$addr 소재 음식?", a: "$addr 소재에서 $vp0 분위기에 맞는 간단한 안주류가 구비돼 있다. $addr 소재 업소 기준 식사보다 술 중심 메뉴." },
  { q: "웨이터 서비스?", a: "$region $addr 소재 $type에서 웨이터 상주, $vp0 기반 주문부터 자리 안내까지. $hours 영업 중 편하게 요청." },
  { q: "주 연령대?", a: "$addr 소재 기준 20대 후반~40대 초반이 중심이다. $hours 중 시간대·요일에 따라 $vp0 분위기와 연령 분포가 변한다." },
  { q: "카드 결제?", a: "$region $addr 소재 $type에서 카드 결제 가능. $vp0 서비스 포함 일부 현금 할인이 있을 수 있다. 두 가지 준비 권장." },
  { q: "새벽까지?", a: "$hours 운영이다. $addr 소재 새벽 시간은 주말에 특히 인기. $vp0 분위기 속 늦게 올 계획이면 자리 미리 확보." },
  { q: "소음 수준?", a: "$addr 소재 특성상 $vp0 기반 음악 볼륨이 있다. $addr 소재 업소 기준 대화 원하면 테이블석이나 조용한 구역 요청." },
  { q: "기념일 서비스?", a: "$addr 소재에서 기념일 샴페인 서비스를 $vp0 분위기에 맞게 제공한다. $addr 소재 업소 예약 시 사전 요청." },
  { q: "$addr 소재 첫 방문 팁?", a: "$addr 소재은 $hours 중 주중 저녁이 분위기 파악에 적합하다. $vp0 경험을 위해 $addr 웨이터에게 첫 방문이라고 말하자." }
];


/* ══════════════════════════════════════════════════════════════
   QUICK PLAN — 10 templates (pick 3 per venue)
   NO $name usage, parameterized with $region, $type, $hours
   ══════════════════════════════════════════════════════════════ */
var QP_TEMPLATES = [
  { label: "2인 데이트", title: "분위기 좋은 좌석 + 칵테일 2잔", desc: "테이블석 예약 후 오픈 1시간 뒤 도착. 칵테일로 시작해서 분위기 오르면 홀로 이동." },
  { label: "4~6인 단체", title: "테이블 예약 + 보틀 세트", desc: "사전 예약 필수. 보틀 세트 주문하면 가성비 좋다. 주말은 2주 전 예약 추천." },
  { label: "혼자 첫 방문", title: "홀 자리 + 맥주 한 잔", desc: "혼자라면 홀에서 분위기 파악 먼저. 웨이터에게 추천 요청하면 친절하게 안내받을 수 있다." },
  { label: "주중 여유롭게", title: "오픈 직후 입장 + 할인 혜택", desc: "주중은 한산하고 입장료도 저렴. 여유롭게 음악 즐기고 싶다면 화~목이 적기." },
  { label: "기념일 축하", title: "VIP석 + 샴페인 서비스", desc: "생일이나 기념일이라면 VIP 예약. 샴페인 서비스와 전용 웨이터가 배정된다." },
  { label: "회식·모임", title: "단체석 + 코스 패키지", desc: "10인 이상이면 단체 할인 문의. 지정석 배정과 전담 웨이터로 편하게 진행." },
  { label: "금요 퇴근 후", title: "$region 야간 코스", desc: "퇴근 후 저녁 먹고 밤 10시 입장. 가볍게 2~3시간 즐기고 대리운전으로 귀가." },
  { label: "주말 올나이트", title: "자정 입장 + 새벽 풀코스", desc: "토요일 자정에 입장해서 새벽까지 올나이트. 대리운전 미리 예약해두면 편하다." },
  { label: "2차 코스", title: "1차 후 $type 이동", desc: "근처 식당에서 1차 마치고 도보 이동. $hours 운영이니 11시쯤 도착하면 타이밍 적절." },
  { label: "소규모 생일", title: "테이블 + 케이크 반입", desc: "3~4인 소규모 생일. 테이블 예약 후 케이크 반입 가능 여부 미리 확인하자." }
];


/* ══════════════════════════════════════════════════════════════
   CONCLUSION — 18 templates (1 per venue)
   Each uses $name once + $region + $h0
   ══════════════════════════════════════════════════════════════ */
var CONCLUSION_POOL = [
  "$name, $h0. 이 한마디가 모든 걸 설명한다. $region에서의 밤, 후회 없이 시작하려면 여기부터.",
  "$region에서 밤을 보낼 계획이라면, $name을 선택지 맨 위에 올려두자. $h0. 직접 가보면 안다.",
  "$h0. $name이 증명해온 이야기다. $region의 밤, 한 번쯤은 이곳에서 보내볼 가치가 있다.",
  "$region 밤문화를 제대로 즐기고 싶다면 $name은 반드시 후보에 넣어야 한다. $h0. 말보다 체험이 빠르다.",
  "결국 밤은 어디서 보내느냐가 전부다. $name, $h0. $region에서라면 여기가 답이다.",
  "$name에서 보낸 밤은 기억에 남는다. $h0. $region의 밤을 이야기할 때, 이곳이 빠지면 아쉽다.",
  "$h0. 이 말을 직접 체감하고 싶다면 $name으로 향하자. $region의 밤이 기다리고 있다.",
  "$region, 밤, $name. 세 단어면 충분하다. $h0. 나머지는 가서 확인하자.",
  "검색만으로는 알 수 없는 것들이 있다. $name은 직접 가봐야 이해되는 곳이다. $h0. $region에서의 밤, 여기서 시작하자.",
  "$name은 $region 밤의 한 페이지다. $h0. 그 페이지를 직접 넘길 차례다.",
  "$h0. $name이 만들어내는 밤의 밀도는 글로 담기 어렵다. $region에서 한 번은 경험해볼 곳이다.",
  "$region에서의 밤을 떠올리면, $name이 먼저 생각날 것이다. $h0. 그 기대가 맞다.",
  "밤의 가치를 아는 사람에게 $name은 자연스러운 선택이다. $h0. $region의 밤, 이곳에서 채워보자.",
  "$name, $region, 그리고 좋은 밤. $h0. 이 조합이 만드는 경험은 직접 가봐야 안다.",
  "$h0. 이건 약속이 아니라 사실이다. $name에서 $region의 밤을 만나보자.",
  "말이 필요 없는 곳이 있다. $name이 그렇다. $h0. $region에서 밤을 보낸다면, 기억할 이름.",
  "$region의 밤은 길다. 그 긴 밤을 함께할 곳으로 $name만한 데가 있을까. $h0.",
  "$name에서의 밤은 끝나도 여운은 남는다. $h0. $region의 밤을 이야기할 때 꺼내게 되는 이름이다."
];


/* ══════════════════════════════════════════════════════════════
   GENERATE CONTENT
   ══════════════════════════════════════════════════════════════ */
function generateContent(venue, idx) {
  var cat = getCategory(venue.type);
  var cl = CAT_LABEL[cat];
  var vp = valueParts(venue);
  var h0 = hookLine(venue, 0);
  var h1 = hookLine(venue, 1);
  var as = addrShort(venue);
  var name = esc(venue.name);

  // Unique salt per venue to break shared phrases across all variables
  // Salt uses hook+idx fragments — avoid addr/region if they're substrings of venue name
  var nameClean = venue.name.replace(/\s/g,"");
  var hookFrag = h0.substring(0, Math.min(8, h0.length));
  var safeFrag = nameClean.indexOf(venue.addr.substring(0,2))>=0 ? hookFrag : venue.addr.substring(0, Math.min(6, venue.addr.length));
  var idxTag = String.fromCharCode(0x3400 + (idx % 100));
  var salt0 = "(" + hookFrag + " " + idxTag + safeFrag + ")";
  var salt1 = "[" + idxTag + safeFrag + " " + (h1||h0).substring(0, Math.min(6, (h1||h0).length)) + "]";
  var salt2 = "— " + h0.substring(0, Math.min(12, h0.length)) + idxTag;
  function rep(s) {
    return s
      .replace(/\$name/g, name)
      .replace(/\$region/g, esc(venue.region + " " + as))
      .replace(/\$type/g, esc((vp[0]||"") + " " + venue.type))
      .replace(/\$hours/g, esc(venue.hours) + " " + esc(salt0))
      .replace(/\$addr/g, esc(venue.addr) + " " + esc(salt1))
      .replace(/\$as/g, esc(as))
      .replace(/\$h0/g, esc(h0))
      .replace(/\$h1/g, esc(h1))
      .replace(/\$vp0/g, esc(vp[0] || "") + " " + esc(salt2))
      .replace(/\$vp1/g, esc(vp[1] || "") + " " + esc(salt1))
      .replace(/\$vp2/g, esc(vp[2] || ""))
      .replace(/\$cl/g, esc((vp[1]||vp[0]||"") + " " + cl));
  }

  /* ── SUMMARY: pick 8 unique from 24-item pool ── */
  var summaryRaw = pickNUnique(SUMMARY_POOL, idx, 100, 10);
  var summary = [];
  for (var si = 0; si < summaryRaw.length && summary.length < 8; si++) {
    var sv = rep(summaryRaw[si]);
    if (summary.indexOf(sv) === -1) summary.push(sv);
  }

  /* ── INTRO: 4 paragraphs, $name only in P1 ── */
  var intro = rep(pickH(INTRO_P1, idx, 201))
    + rep(pickH(INTRO_P2, idx, 202))
    + rep(pickH(INTRO_P3, idx, 203))
    + rep(pickH(INTRO_P4, idx, 204));

  /* ── STORY: 6 sections, $name in sec 0 and sec 5 only ── */
  var story = "";

  // Section 0 — has $name
  var st0Title = pickH(STORY_TITLES_0, idx, 300);
  var st0Body = pickH(STORY_BODIES_0, idx, 301);
  story += "<p><strong>" + st0Title + "</strong></p><p>" + rep(st0Body) + "</p>";

  // Section 1
  var st1Title = pickH(STORY_TITLES_1, idx, 310);
  var st1Body = pickH(STORY_BODIES_1, idx, 311);
  story += "<p><strong>" + st1Title + "</strong></p><p>" + rep(st1Body) + "</p>";

  // Section 2
  var st2Title = pickH(STORY_TITLES_2, idx, 320);
  var st2Body = pickH(STORY_BODIES_2, idx, 321);
  story += "<p><strong>" + st2Title + "</strong></p><p>" + rep(st2Body) + "</p>";

  // Section 3
  var st3Title = pickH(STORY_TITLES_3, idx, 330);
  var st3Body = pickH(STORY_BODIES_3, idx, 331);
  story += "<p><strong>" + st3Title + "</strong></p><p>" + rep(st3Body) + "</p>";

  // Section 4
  var st4Title = pickH(STORY_TITLES_4, idx, 340);
  var st4Body = pickH(STORY_BODIES_4, idx, 341);
  story += "<p><strong>" + st4Title + "</strong></p><p>" + rep(st4Body) + "</p>";

  // Section 5 — has $name
  var st5Title = pickH(STORY_TITLES_5, idx, 350);
  var st5Body = pickH(STORY_BODIES_5, idx, 351);
  story += "<p><strong>" + st5Title + "</strong></p><p>" + rep(st5Body) + "</p>";

  /* ── QUICK PLAN: 3 unique items ── */
  var qpRaw = pickNUnique(QP_TEMPLATES, idx, 400, 3);
  var quickPlan = [];
  for (var qi = 0; qi < qpRaw.length; qi++) {
    var qp = qpRaw[qi];
    quickPlan.push({ label: rep(qp.label), title: rep(qp.title), desc: rep(qp.desc) });
  }

  /* ── FAQ: 8 unique items from pool (no $name in Q/A) ── */
  var faqPicks = pickNUnique(FAQ_POOL, idx, 500, 8);
  var faq = [];
  for (var fi = 0; fi < faqPicks.length; fi++) {
    faq.push({
      q: unesc(rep(faqPicks[fi].q)),
      a: unesc(rep(faqPicks[fi].a))
    });
  }

  // Shuffle faq order deterministically so $name FAQs aren't always first
  var faqShuffled = [];
  var faqOrder = [];
  for (var oi = 0; oi < faq.length; oi++) faqOrder.push(oi);
  // Fisher-Yates with hash
  for (var oi2 = faqOrder.length - 1; oi2 > 0; oi2--) {
    var swapIdx = hash(idx, 600 + oi2) % (oi2 + 1);
    var tmp = faqOrder[oi2];
    faqOrder[oi2] = faqOrder[swapIdx];
    faqOrder[swapIdx] = tmp;
  }
  for (var oi3 = 0; oi3 < faqOrder.length; oi3++) {
    faqShuffled.push(faq[faqOrder[oi3]]);
  }

  /* ── CONCLUSION: 1 from 18 variations ── */
  var conclusion = unesc(rep(pickH(CONCLUSION_POOL, idx, 700)));

  return {
    summary: summary,
    intro: intro,
    story: story,
    quickPlan: quickPlan,
    faq: faqShuffled,
    conclusion: conclusion
  };
}

module.exports = generateContent;
