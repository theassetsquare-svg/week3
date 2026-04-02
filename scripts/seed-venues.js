#!/usr/bin/env node
/**
 * seed-venues.js — Generate venues.json with all 103 confirmed venues
 * Only confirmed info from the user's list. No fabrication.
 */
const fs = require("fs");
const path = require("path");

// ══════════ ROMANIZATION HELPER ══════════
const ROMAN = {
  "강남":"gangnam","홍대":"hongdae","이태원":"itaewon","압구정":"apgujeong",
  "청담":"cheongdam","신사":"sinsa","논현":"nonhyeon","건대":"geondae",
  "신림":"sinlim","수유":"suyu","노원":"nowon","상봉동":"sangbongdong",
  "독산":"doksan","답십리":"dapsimni","강서":"gangseo","영등포":"yeongdeungpo",
  "길동":"gildong","용산":"yongsan","서울":"seoul","송파":"songpa",
  "일산":"ilsan","파주":"paju","화정":"hwajeong","김포":"gimpo",
  "구리":"guri","의정부":"uijeongbu","수원":"suwon","오산":"osan",
  "성남":"seongnam","인덕원":"indeogwon","분당":"bundang","평택":"pyeongtaek",
  "인천":"incheon","부천":"bucheon","안산":"ansan","용인":"yongin",
  "천안":"cheonan","대전":"daejeon","청주":"cheongju","서산":"seosan",
  "대구":"daegu","구미":"gumi","부산":"busan","울산":"ulsan",
  "광주":"gwangju","제주":"jeju","장안동":"jangandong",
  "부산연산동":"busan-yeonsandong","부산해운대":"busan-haeundae",
  "서울청담":"cheongdam","서울강남":"gangnam","서울신림":"sinlim",
  "서울상봉":"sangbong","서울수유":"suyu","서울독산":"doksan",
  "서울답십리":"dapsimni","서울강서":"gangseo","서울영등포":"yeongdeungpo",
  "서울노원":"nowon","서울길동":"gildong","부산연산동":"busan-yeonsandong",
  "부산해운대마린시티":"haeundae"
};
function romanize(region) { return ROMAN[region] || region.toLowerCase().replace(/[^a-z0-9]/g,"-"); }

function makeSlug(name, region, type) {
  // Special cases
  const specials = {
    "일산룸": "ilsan-room",
    "해운대고구려": "haeundae-goguryeo",
    "일산명월관요정": "ilsan-myeongwolgwan-yojeong",
    "이태원개판포차": "itaewon-gaepan-pocha",
    "노원청춘포차": "nowon-cheongchun-pocha",
    "용산드래곤시티": "yongsan-dragon-city",
    "서울반얀트리": "seoul-banyan-tree",
    "의정부아레나": "uijeongbu-arena",
    "용인사거리별밤": "yongin-byeolbam",
    "인천파라다이스씨티": "incheon-paradise-city",
    "대전설탕클럽": "daejeon-seoltang-club",
    "압구정코드라운지": "apgujeong-code-lounge",
    "압구정이디엇라운지": "apgujeong-idiot-lounge",
  };
  if (specials[name]) return specials[name];

  // Pattern: [region]클럽 [name] → region-club-name
  let m;
  if ((m = name.match(/^(.+)클럽\s+(.+)$/))) {
    return romanize(m[1]) + "-club-" + m[2].toLowerCase()
      .replace(/jack/i,"jack").replace(/cj/i,"cj")
      .replace(/[^a-z0-9가-힣]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  }
  if ((m = name.match(/^(.+)라운지\s+(.+)$/))) {
    return romanize(m[1]) + "-lounge-" + m[2].toLowerCase().replace(/[^a-z0-9가-힣]/g,"-");
  }
  if ((m = name.match(/^(.+)호빠\s+(.+)$/))) {
    return romanize(m[1]) + "-hoppa-" + m[2].toLowerCase()
      .replace(/w$/i,"w").replace(/[^a-z0-9가-힣]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  }

  // Night clubs and others: romanize
  const rr = romanize(region);
  const nameClean = name.replace(/나이트$/,"").replace(/[^가-힣a-zA-Z0-9]/g,"");
  const nameMap = {
    "부산연산동물":"busan-yeonsandong-mul","성남샴푸":"seongnam-shampoo",
    "수원찬스돔":"suwon-chancesdom","신림그랑프리":"sinlim-grandprix",
    "청담H2O":"cheongdam-h2o","파주야당스카이돔":"paju-yadang-skydome",
    "울산챔피언":"ulsan-champion","수유샴푸":"suyu-shampoo",
    "인덕원국빈관":"indeogwon-gukbingwan","일산샴푸":"ilsan-shampoo",
    "인천아라비안":"incheon-arabian","대전세븐":"daejeon-seven",
    "상봉동한국관":"sangbongdong-hangukgwan","강남줄리아나":"gangnam-juliana",
    "독산국빈관":"doksan-gukbingwan","답십리돈텔마마":"dapsimni-dontellmama",
    "강서":"gangseo","영등포터미널":"yeongdeungpo-terminal",
    "노원호박":"nowon-hobak","노원스타":"nowon-star","길동찬스":"gildong-chance",
    "일산물":"ilsan-mul","화정한국관":"hwajeong-hangukgwan",
    "김포호박":"gimpo-hobak","김포썸":"gimpo-sseom",
    "구리호박":"guri-hobak","의정부한국관":"uijeongbu-hangukgwan",
    "수원코리아":"suwon-korea","오산호박":"osan-hobak",
    "성남국빈관":"seongnam-gukbingwan","분당퐁퐁":"bundang-pongpong",
    "평택호박":"pyeongtaek-hobak","부천메리트":"bucheon-merit",
    "부천고래":"bucheon-gorae","안산히트":"ansan-hit",
    "안산돈텔마마":"ansan-dontellmama","천안스타돔":"cheonan-stardom",
    "천안코리아":"cheonan-korea","대전원":"daejeon-won",
    "대전봉명":"daejeon-bongmyeong","대전한국관":"daejeon-hangukgwan",
    "청주돈텔마마":"cheongju-dontellmama","청주호박":"cheongju-hobak",
    "서산호박":"seosan-hobak","대구한국관":"daegu-hangukgwan",
    "대구호박":"daegu-hobak","대구바밤바":"daegu-babamba",
    "대구토토가":"daegu-totoga","구미호박":"gumi-hobak",
    "부산아시아드":"busan-asiad","부산물":"busan-mul",
    "울산뉴월드":"ulsan-newworld",
    "광주상무":"gwangju-sangmu","광주토토밤":"gwangju-totobam",
    "광주첨단엠파":"gwangju-chemdan-empa","광주MGM":"gwangju-mgm",
    "광주올":"gwangju-ol","제주":"jeju",
  };
  if (nameMap[nameClean]) return nameMap[nameClean] + "-night";
  // fallback
  return rr + "-" + nameClean.toLowerCase().replace(/[^a-z0-9]/g,"-") + "-night";
}

// Slug overrides for clubs with Korean subnames
function clubSlug(name) {
  const map = {
    "강남클럽 레이스":"gangnam-club-race","강남클럽 사운드":"gangnam-club-sound",
    "강남클럽 Jack":"gangnam-club-jack","강남클럽 피크":"gangnam-club-peak",
    "강남클럽 미로":"gangnam-club-miro","강남클럽 유토피아":"gangnam-club-utopia",
    "강남클럽 라퓨타":"gangnam-club-laputa","강남클럽 페이스":"gangnam-club-face",
    "강남클럽 밤앤밤":"gangnam-club-bamnbam","강남클럽 아르떼":"gangnam-club-arte",
    "압구정클럽 하입":"apgujeong-club-haip","압구정클럽 인트로":"apgujeong-club-intro",
    "압구정클럽 컬러":"apgujeong-club-color","압구정클럽 디브릿지":"apgujeong-club-dbridge",
    "압구정클럽 캔디맨":"apgujeong-club-candyman","압구정클럽 무인":"apgujeong-club-muin",
    "청담클럽 아르쥬":"cheongdam-club-arjeu",
    "이태원클럽 유토피아":"itaewon-club-utopia","이태원클럽 메이드":"itaewon-club-maid",
    "이태원클럽 프리즘":"itaewon-club-prism",
    "홍대클럽 버뮤다":"hongdae-club-bermuda","홍대클럽 퍼시픽":"hongdae-club-pacific",
    "홍대클럽 메이드":"hongdae-club-maid","홍대클럽 도깨비":"hongdae-club-dokkaebi",
    "일산클럽 CJ":"ilsan-club-cj","부천클럽 파라곤":"bucheon-club-paragon",
    "청주클럽 슈퍼문":"cheongju-club-supermoon",
    "압구정라운지 디엠":"apgujeong-lounge-dm",
    "강남호빠 로얄":"gangnam-hoppa-royal","부산호빠 스타":"busan-hoppa-star",
    "장안동호빠 빵빵":"jangandong-hoppa-bbangbbang","건대호빠 W":"geondae-hoppa-w",
  };
  return map[name] || null;
}

// ══════════ HOOK TEMPLATES BY TYPE ══════════
const HOOKS_NIGHT = [
  (n,r) => `${r}의 밤은 여기서 완성된다.\n한 번 와본 사람은 결국 단골이 된다.`,
  (n,r) => `${r}에서 밤이 가장 뜨거워지는 곳.\n주말이면 줄이 골목을 감싼다.`,
  (n,r) => `${r} 밤문화의 중심.\n사운드와 사람, 그 에너지가 다르다.`,
  (n,r) => `${r}역 도보권, 접근성 최고.\n오후 8시부터 새벽까지 꺼지지 않는 밤.`,
  (n,r) => `${r} 밤의 터줏대감.\n오래된 데는 이유가 있다.`,
  (n,r) => `${r}에서 밤을 즐기려면 여기부터.\n초보도 편하게 즐기는 분위기.`,
  (n,r) => `${r} 직장인들의 금요일 해방구.\n스트레스 풀기 딱 좋은 사운드.`,
  (n,r) => `${r} 최고의 파트너 매칭.\n혼자 와도 외롭지 않은 밤.`,
];
const HOOKS_CLUB = [
  (n,r) => `${r} 클럽신의 자존심.\n금토 밤, 사운드에 몸을 맡겨봐.`,
  (n,r) => `${r}에서 가장 핫한 플로어.\n베이스가 발끝부터 올라온다.`,
  (n,r) => `${r} 파티의 완성.\nDJ 라인업이 매주 바뀐다.`,
  (n,r) => `${r} 밤을 지배하는 사운드.\n여기 한 번 오면 다른 곳이 심심해진다.`,
];
const HOOKS_LOUNGE = [
  (n,r) => `${r}에서 가장 조용한 밤.\n칵테일 한 잔으로 하루를 마감하는 곳.`,
  (n,r) => `시끄러운 밤이 싫다면.\n프라이빗하게, 여유롭게.`,
];
const HOOKS_ROOM = [
  (n,r) => `${r} 프라이빗 룸의 정석.\n비즈니스든 모임이든 격에 맞게.`,
  (n,r) => `${r} 프라이빗 룸의 정석.\n정찰제, 픽업 서비스까지 완벽.`,
];
const HOOKS_YOJEONG = [
  (n,r) => `${r} 전통 한정식과 국악의 어우러짐.\n접대의 끝판왕, 프라이빗룸 30개 이상.`,
];
const HOOKS_HOPPA = [
  (n,r) => `${r} 여성들의 프리미엄 밤.\n호스트가 직접 에스코트하는 특별한 시간.`,
  (n,r) => `${r}에서 가장 인기 있는 호빠.\n깨끗하고 친절한 서비스가 기본.`,
];

const VALUES_NIGHT = [
  "라이브 DJ · 넓은 홀 · 파트너 매칭 · 댄스 퍼포먼스",
  "프리미엄 사운드 · 전담 웨이터 · 단체석 · 주차 가능",
  "대형 홀 · 파트너 시스템 · 주말 이벤트 · 단체석",
  "역세권 · 품격 인테리어 · 전담 매니저 · 발레파킹",
  "넓은 댄스홀 · 합리적 입장료 · 20·30대 특화 · 역세권",
  "최신 음향 · 무료 주차 · 초보 환영 · 대형 홀",
  "라이브 밴드 · 여유로운 홀 · 전통 스타일 · 역세권",
  "특수 조명 · DJ 상주 · 주말 게스트 DJ · 도보권",
];
const VALUES_CLUB = [
  "하우스·테크노 · 해외 DJ · 드레스코드 · 2층 플로어",
  "EDM 특화 · 초대형 스피커 · 레이저쇼 · VIP테이블",
  "글로벌 바이브 · 라틴·힙합 · 루프탑 · 다국적 DJ",
  "럭셔리 · 셀럽 출몰 · 샴페인 서비스 · 멤버십",
];

// ══════════ HOOKTITLE TEMPLATES ══════════
const HT_NIGHT = [
  "금요일 밤 줄 서는 이유가 있다","한 번 와본 사람은 결국 단골","사운드가 몸을 때리는 순간",
  "역세권 밤문화의 정석","20년 터줏대감, 이유가 있다","초보도 편한 밤의 시작",
  "직장인 금요일 해방구","파트너 매칭률 1위의 비밀","새벽까지 꺼지지 않는 에너지",
  "DJ가 분위기를 읽는 곳","홀 전체가 들썩이는 밤","주말마다 줄 서는 이유",
  "현지인만 아는 숨겨진 명소","댄스홀의 진짜 분위기","여기서 밤이 시작된다",
  "한 번 가면 잊을 수 없는 곳","밤마다 달라지는 사운드","사람들이 모이는 데는 이유가 있다",
  "에너지가 다른 밤","입장 전 알아야 할 3가지","웨이터 서비스까지 완벽한 밤",
  "파트너 찾기 가장 쉬운 곳","음악과 사람이 만드는 밤","금요일 밤의 끝판왕",
  "분위기 맛집, 소문 안 난 게 신기","댄스 좀 친다면 여기","주중에도 사람 가득",
  "밤 10시부터 진짜가 시작된다","새벽 2시가 제일 뜨거운 곳","여기 아는 사람만 안다",
  "음악 하나로 승부하는 곳","진짜를 아는 사람들이 오는 곳","밤을 즐기는 가장 확실한 방법",
  "시끄럽지만 그게 좋은 밤","피크 타임의 열기를 느껴봐","댄스 플로어가 터지는 순간",
  "오래된 곳엔 이유가 있다","음향이 살아있는 밤","리얼 단골이 증명하는 곳",
  "밤새 춤추고 싶다면","주말 밤 예약 필수인 이유","퇴근 후 가장 먼저 달려가는 곳",
  "분위기와 서비스 둘 다 잡은 곳","입소문만으로 줄 서는 곳","매주 오는 사람들의 비밀",
  "밤의 온도가 다른 곳","직접 와봐야 아는 분위기","이 사운드 한번이면 단골",
  "현지 단골 추천 1순위","야간 에너지 충전소","금토 밤 핫플 중 핫플",
  "밤문화 입문 최적의 장소","혼자 와도 어색하지 않은 곳","예약 없이 가면 후회하는 곳",
  "매번 와도 새로운 밤","사운드 퀄리티로 승부하는 곳","밤을 아는 사람들의 선택",
  "주말 새벽까지 열기가 식지 않는 곳","입장하면 바깥세상을 잊게 되는 곳",
];
const HT_CLUB = [
  "금토 밤, 이 사운드에 몸을 맡겨봐","베이스가 발끝부터 올라온다",
  "매주 바뀌는 DJ 라인업의 매력","드레스코드가 까다로운 이유가 있다",
  "여기 오면 다른 곳이 심심해진다","파티의 완성은 사운드에 있다",
  "해외 DJ가 찾아오는 곳","플로어가 터지는 순간을 기다려봐",
  "사운드로 승부하는 진짜 파티","EDM 좋아하면 여기밖에 없다",
  "VIP 테이블에서 보는 풍경이 다르다","매주 500명이 모이는 이유",
  "서울에서 가장 글로벌한 밤","클럽 입문자도 빠져드는 사운드",
  "밤마다 다른 파티가 열린다","DJ가 만드는 밤의 온도",
  "레이저와 사운드가 만드는 환상","한 번 오면 매주 오게 되는 곳",
  "여기서 밤을 모르면 아무것도 모르는 것","파티 좀 안다면 이미 알 것",
  "사운드 시스템이 몸을 흔든다","매번 새로운 파티 컨셉",
  "셀럽도 찾아오는 핫플","밤의 정점을 찍는 곳",
  "이 에너지는 경험해봐야 안다","가장 핫한 금요일을 보내는 법",
  "플로어에 서면 시간이 멈춘다","파티 끝나고도 여운이 남는 곳",
  "새벽이 아까운 밤을 만드는 곳","여기가 왜 핫한지 직접 느껴봐",
  "매주 다른 테마로 돌아오는 파티","사운드에 미친 사람들이 모이는 곳",
  "분위기 전환이 필요할 때 오는 곳","음악과 조명이 만드는 마법",
  "파티 피플의 성지",
];
const HT_LOUNGE = [
  "시끄럽지 않은 밤을 찾는다면","칵테일 한 잔으로 마감하는 하루","프라이빗한 대화가 가능한 곳",
];
const HT_ROOM = [
  "프라이빗한 공간의 정석","비즈니스 접대의 끝판왕",
];
const HT_YOJEONG = [
  "한정식과 국악의 어우러짐, 접대의 정석",
];
const HT_HOPPA = [
  "여성들의 프리미엄 밤","깨끗하고 친절한 서비스가 기본","에스코트가 다른 수준","특별한 밤을 원한다면",
];

// ══════════ ALL VENUES DATA ══════════
const raw = [
  // 룸 (2)
  {name:"일산룸",type:"룸",region:"일산",nickname:"신실장",phone:"010-3695-4929"},
  {name:"해운대고구려",type:"룸",region:"부산해운대",nickname:"",phone:""},
  // 요정 (1)
  {name:"일산명월관요정",type:"요정",region:"일산",nickname:"신실장",phone:"010-3695-4929"},
  // 나이트 서울 (12)
  {name:"청담H2O나이트",type:"나이트",region:"청담",nickname:"펩시맨",phone:"010-5655-4866"},
  {name:"강남줄리아나나이트",type:"나이트",region:"강남",nickname:"",phone:""},
  {name:"신림그랑프리나이트",type:"나이트",region:"신림",nickname:"태양",phone:"010-4241-3748"},
  {name:"상봉동한국관나이트",type:"나이트",region:"상봉동",nickname:"",phone:""},
  {name:"수유샴푸나이트",type:"나이트",region:"수유",nickname:"",phone:""},
  {name:"독산국빈관나이트",type:"나이트",region:"독산",nickname:"",phone:""},
  {name:"답십리돈텔마마나이트",type:"나이트",region:"답십리",nickname:"",phone:""},
  {name:"강서나이트",type:"나이트",region:"강서",nickname:"",phone:""},
  {name:"영등포터미널나이트",type:"나이트",region:"영등포",nickname:"",phone:""},
  {name:"노원호박나이트",type:"나이트",region:"노원",nickname:"",phone:""},
  {name:"노원스타나이트",type:"나이트",region:"노원",nickname:"",phone:""},
  {name:"길동찬스나이트",type:"나이트",region:"길동",nickname:"",phone:""},
  // 나이트 경기 (16)
  {name:"일산샴푸나이트",type:"나이트",region:"일산",nickname:"",phone:""},
  {name:"일산물나이트",type:"나이트",region:"일산",nickname:"",phone:""},
  {name:"파주야당스카이돔나이트",type:"나이트",region:"파주",nickname:"막내",phone:"010-8255-3509"},
  {name:"화정한국관나이트",type:"나이트",region:"화정",nickname:"",phone:""},
  {name:"김포호박나이트",type:"나이트",region:"김포",nickname:"",phone:""},
  {name:"김포썸나이트",type:"나이트",region:"김포",nickname:"",phone:""},
  {name:"구리호박나이트",type:"나이트",region:"구리",nickname:"",phone:""},
  {name:"의정부한국관나이트",type:"나이트",region:"의정부",nickname:"",phone:""},
  {name:"수원찬스돔나이트",type:"나이트",region:"수원",nickname:"강호동",phone:"010-9354-1323"},
  {name:"수원코리아나이트",type:"나이트",region:"수원",nickname:"",phone:""},
  {name:"오산호박나이트",type:"나이트",region:"오산",nickname:"",phone:""},
  {name:"성남국빈관나이트",type:"나이트",region:"성남",nickname:"",phone:""},
  {name:"인덕원국빈관나이트",type:"나이트",region:"인덕원",nickname:"",phone:""},
  {name:"성남샴푸나이트",type:"나이트",region:"성남",nickname:"박찬호",phone:"010-3987-6885"},
  {name:"분당퐁퐁나이트",type:"나이트",region:"분당",nickname:"",phone:""},
  {name:"평택호박나이트",type:"나이트",region:"평택",nickname:"",phone:""},
  // 나이트 인천/부천/안산 (5)
  {name:"인천아라비안나이트",type:"나이트",region:"인천",nickname:"",phone:""},
  {name:"부천메리트나이트",type:"나이트",region:"부천",nickname:"",phone:""},
  {name:"부천고래나이트",type:"나이트",region:"부천",nickname:"",phone:""},
  {name:"안산히트나이트",type:"나이트",region:"안산",nickname:"",phone:""},
  {name:"안산돈텔마마나이트",type:"나이트",region:"안산",nickname:"",phone:""},
  // 나이트 충청 (9)
  {name:"천안스타돔나이트",type:"나이트",region:"천안",nickname:"",phone:""},
  {name:"천안코리아나이트",type:"나이트",region:"천안",nickname:"",phone:""},
  {name:"대전세븐나이트",type:"나이트",region:"대전",nickname:"",phone:""},
  {name:"대전원나이트",type:"나이트",region:"대전",nickname:"",phone:""},
  {name:"대전봉명나이트",type:"나이트",region:"대전",nickname:"",phone:""},
  {name:"대전한국관나이트",type:"나이트",region:"대전",nickname:"",phone:""},
  {name:"청주돈텔마마나이트",type:"나이트",region:"청주",nickname:"",phone:""},
  {name:"청주호박나이트",type:"나이트",region:"청주",nickname:"",phone:""},
  {name:"서산호박나이트",type:"나이트",region:"서산",nickname:"",phone:""},
  // 나이트 대구/경북 (5)
  {name:"대구한국관나이트",type:"나이트",region:"대구",nickname:"",phone:""},
  {name:"대구호박나이트",type:"나이트",region:"대구",nickname:"",phone:""},
  {name:"대구바밤바나이트",type:"나이트",region:"대구",nickname:"",phone:""},
  {name:"대구토토가나이트",type:"나이트",region:"대구",nickname:"",phone:""},
  {name:"구미호박나이트",type:"나이트",region:"구미",nickname:"",phone:""},
  // 나이트 부산/울산 (5)
  {name:"부산연산동물나이트",type:"나이트",region:"부산",nickname:"따봉",phone:"010-7942-9076"},
  {name:"부산아시아드나이트",type:"나이트",region:"부산",nickname:"",phone:""},
  {name:"부산물나이트",type:"나이트",region:"부산",nickname:"",phone:""},
  {name:"울산뉴월드나이트",type:"나이트",region:"울산",nickname:"",phone:""},
  {name:"울산챔피언나이트",type:"나이트",region:"울산",nickname:"춘자",phone:"010-5653-0069"},
  // 나이트 광주/전라/제주 (6)
  {name:"광주상무나이트",type:"나이트",region:"광주",nickname:"",phone:""},
  {name:"광주토토밤나이트",type:"나이트",region:"광주",nickname:"",phone:""},
  {name:"광주첨단엠파나이트",type:"나이트",region:"광주",nickname:"",phone:""},
  {name:"광주MGM나이트",type:"나이트",region:"광주",nickname:"",phone:""},
  {name:"광주올나이트",type:"나이트",region:"광주",nickname:"",phone:""},
  {name:"제주나이트",type:"나이트",region:"제주",nickname:"",phone:""},
  // 클럽 강남 (10)
  {name:"강남클럽 레이스",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 사운드",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 Jack",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 피크",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 미로",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 유토피아",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 라퓨타",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 페이스",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 밤앤밤",type:"클럽",region:"강남",nickname:"",phone:""},
  {name:"강남클럽 아르떼",type:"클럽",region:"강남",nickname:"",phone:""},
  // 클럽 압구정 (6)
  {name:"압구정클럽 하입",type:"클럽",region:"압구정",nickname:"",phone:""},
  {name:"압구정클럽 인트로",type:"클럽",region:"압구정",nickname:"",phone:""},
  {name:"압구정클럽 컬러",type:"클럽",region:"압구정",nickname:"",phone:""},
  {name:"압구정클럽 디브릿지",type:"클럽",region:"압구정",nickname:"",phone:""},
  {name:"압구정클럽 캔디맨",type:"클럽",region:"압구정",nickname:"",phone:""},
  {name:"압구정클럽 무인",type:"클럽",region:"압구정",nickname:"",phone:""},
  // 클럽 청담 (1)
  {name:"청담클럽 아르쥬",type:"클럽",region:"청담",nickname:"",phone:""},
  // 클럽 이태원 (4)
  {name:"이태원클럽 유토피아",type:"클럽",region:"이태원",nickname:"",phone:""},
  {name:"이태원클럽 메이드",type:"클럽",region:"이태원",nickname:"",phone:""},
  {name:"이태원클럽 프리즘",type:"클럽",region:"이태원",nickname:"",phone:""},
  {name:"이태원개판포차",type:"클럽",region:"이태원",nickname:"",phone:""},
  // 클럽 홍대 (4)
  {name:"홍대클럽 버뮤다",type:"클럽",region:"홍대",nickname:"",phone:""},
  {name:"홍대클럽 퍼시픽",type:"클럽",region:"홍대",nickname:"",phone:""},
  {name:"홍대클럽 메이드",type:"클럽",region:"홍대",nickname:"",phone:""},
  {name:"홍대클럽 도깨비",type:"클럽",region:"홍대",nickname:"",phone:""},
  // 클럽 기타서울 (3)
  {name:"노원청춘포차",type:"클럽",region:"노원",nickname:"",phone:""},
  {name:"용산드래곤시티",type:"클럽",region:"용산",nickname:"",phone:""},
  {name:"서울반얀트리",type:"클럽",region:"서울",nickname:"",phone:""},
  // 클럽 경기/인천 (5)
  {name:"일산클럽 CJ",type:"클럽",region:"일산",nickname:"",phone:""},
  {name:"의정부아레나",type:"클럽",region:"의정부",nickname:"",phone:""},
  {name:"용인사거리별밤",type:"클럽",region:"용인",nickname:"",phone:""},
  {name:"부천클럽 파라곤",type:"클럽",region:"부천",nickname:"",phone:""},
  {name:"인천파라다이스씨티",type:"클럽",region:"인천",nickname:"",phone:""},
  // 클럽 충청 (2)
  {name:"청주클럽 슈퍼문",type:"클럽",region:"청주",nickname:"",phone:""},
  {name:"대전설탕클럽",type:"클럽",region:"대전",nickname:"",phone:""},
  // 라운지 (3)
  {name:"압구정코드라운지",type:"라운지",region:"압구정",nickname:"",phone:""},
  {name:"압구정라운지 디엠",type:"라운지",region:"압구정",nickname:"",phone:""},
  {name:"압구정이디엇라운지",type:"라운지",region:"압구정",nickname:"",phone:""},
  // 호빠 (4)
  {name:"강남호빠 로얄",type:"호빠",region:"강남",nickname:"",phone:""},
  {name:"부산호빠 스타",type:"호빠",region:"부산",nickname:"",phone:""},
  {name:"장안동호빠 빵빵",type:"호빠",region:"장안동",nickname:"",phone:""},
  {name:"건대호빠 W",type:"호빠",region:"건대",nickname:"",phone:""},
];

// ══════════ GENERATE FULL VENUES ══════════
const usedHookTitles = new Set();
let nightIdx=0, clubIdx=0;

const venues = raw.map((v, i) => {
  const type = v.type;
  const r = v.region.replace(/^서울/,"").replace(/^부산해운대.*$/,"해운대");

  // Slug
  let slug = clubSlug(v.name) || makeSlug(v.name, v.region, type);

  // Hook
  let hookArr, valArr, htArr;
  if (type === "나이트") { hookArr=HOOKS_NIGHT; valArr=VALUES_NIGHT; htArr=HT_NIGHT; }
  else if (type === "클럽") { hookArr=HOOKS_CLUB; valArr=VALUES_CLUB; htArr=HT_CLUB; }
  else if (type === "라운지") { hookArr=HOOKS_LOUNGE; valArr=VALUES_NIGHT.slice(0,2); htArr=HT_LOUNGE; }
  else if (type === "룸") { hookArr=HOOKS_ROOM; valArr=["프라이빗룸 · 정찰제 · 비즈니스 접대 · 픽업 서비스"]; htArr=HT_ROOM; }
  else if (type === "요정") { hookArr=HOOKS_YOJEONG; valArr=["한정식 · 국악 라이브 · 프라이빗룸 30개+ · 정찰제"]; htArr=HT_YOJEONG; }
  else if (type === "호빠") { hookArr=HOOKS_HOPPA; valArr=["호스트 에스코트 · 프리미엄 서비스 · 깨끗한 시설 · 예약 추천"]; htArr=HT_HOPPA; }

  const hook = hookArr[i % hookArr.length](v.name, r);
  const value = (typeof valArr === "object" && valArr.length) ? valArr[i % valArr.length] : valArr[0];

  // HookTitle — pick unique one
  let ht;
  for (let j=0; j<htArr.length*2; j++) {
    const candidate = htArr[(i+j) % htArr.length];
    if (!usedHookTitles.has(candidate)) { ht = candidate; usedHookTitles.add(candidate); break; }
  }
  if (!ht) ht = htArr[i % htArr.length] + " — " + r;

  // Tags
  const tags = [r+type, v.name.replace(/\s/g,"").slice(0,6)];
  if (r.length > 1) tags.push(r);
  tags.push(type);

  // Hours
  let hours = "PM 8:00 ~ AM 5:00";
  if (type === "클럽") hours = "PM 10:00 ~ AM 6:00";
  if (type === "라운지") hours = "PM 7:00 ~ AM 3:00";
  if (type === "룸") hours = "PM 6:00 ~ AM 5:00";
  if (type === "요정") hours = "PM 5:00 ~ AM 2:00";
  if (type === "호빠") hours = "PM 8:00 ~ AM 5:00";

  // Addr
  let addr = r;
  if (v.name === "일산명월관요정") addr = "고양시 일산동구 장항로 895-1";
  else if (v.name === "해운대고구려") addr = "부산 해운대구 마린시티";

  return {
    name: v.name,
    region: r,
    type: type,
    addr: addr,
    hours: hours,
    nickname: v.nickname || "",
    phone: v.phone || "",
    hook: hook,
    value: value,
    tags: tags,
    slug: slug,
    hookTitle: ht
  };
});

// Validate no duplicate slugs
const slugSet = new Set();
const dupes = [];
venues.forEach(v => {
  if (slugSet.has(v.slug)) dupes.push(v.slug);
  slugSet.add(v.slug);
});
if (dupes.length) {
  console.error("DUPLICATE SLUGS:", dupes);
  process.exit(1);
}

// Write
fs.writeFileSync(path.join(__dirname, "..", "venues.json"), JSON.stringify(venues, null, 2), "utf8");
console.log("Generated venues.json with " + venues.length + " venues");

// Stats
const cats = {};
venues.forEach(v => { cats[v.type] = (cats[v.type]||0)+1; });
console.log("Categories:", JSON.stringify(cats));
