/* ======= 전국 룸 디렉토리 데이터 ======= */
const listings = [

  // ──────────── 일산 ────────────
  {
    name: "일산 명월관",
    region: "일산",
    type: "요정 · 비즈니스룸 · 가라오케",
    addr: "경기 고양시 일산동구 장항로 895-1",
    hours: "365일 24시간 · 100% 예약제",
    tags: ["정찰제", "국악공연", "한식코스", "VIP접대", "프라이빗룸"]
  },
  {
    name: "일산룸 야당점",
    region: "일산",
    type: "퍼블릭룸 · 가라오케",
    addr: "경기 고양시 일산서구 야당동",
    hours: "365일 영업 · 무료픽업",
    tags: ["20대매니저", "무료픽업", "No.1"]
  },
  {
    name: "일산룸 유상무",
    region: "일산",
    type: "비즈니스룸 · 프라이빗",
    addr: "경기 고양시 일산동구",
    hours: "매일 영업",
    tags: ["프라이빗", "편안한분위기", "비즈니스"]
  },

  // ──────────── 강남 ────────────
  {
    name: "달토",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구 역삼동",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭", "인기업소", "초이스"]
  },
  {
    name: "유앤미 (YOU&ME)",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구 역삼동",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭", "대형", "초이스"]
  },
  {
    name: "사라있네",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구 역삼동",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭", "인기", "초이스"]
  },
  {
    name: "다소다",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭", "초이스"]
  },
  {
    name: "도파민",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭", "신규"]
  },
  {
    name: "엘리트",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭", "초이스"]
  },
  {
    name: "115",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭"]
  },
  {
    name: "방탄",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭"]
  },
  {
    name: "워라벨",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭"]
  },
  {
    name: "퍼펙트",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭"]
  },
  {
    name: "수목원",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭"]
  },
  {
    name: "런닝래빗",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭"]
  },
  {
    name: "트렌드",
    region: "강남",
    type: "하이퍼블릭",
    addr: "서울 강남구",
    hours: "매일 저녁영업",
    tags: ["하이퍼블릭"]
  },
  {
    name: "CNN 셔츠룸",
    region: "강남",
    type: "셔츠룸",
    addr: "서울 강남구 선릉",
    hours: "매일 저녁영업",
    tags: ["셔츠룸", "선릉유일", "프리미엄"]
  },
  {
    name: "강남GOOD",
    region: "강남",
    type: "셔츠룸 · 하이퍼블릭 · 레깅스룸",
    addr: "서울 강남구",
    hours: "365일 연중무휴 · 일요일 정상영업",
    tags: ["종합", "365일", "연중무휴"]
  },

  // ──────────── 홍대 ────────────
  {
    name: "홍대룸싸롱",
    region: "홍대",
    type: "퍼블릭룸 · 가라오케",
    addr: "서울 마포구 홍대입구역 인근",
    hours: "매일 저녁영업",
    tags: ["퍼블릭", "가라오케", "홍대"]
  },

  // ──────────── 부산 ────────────
  {
    name: "해운대 고구려",
    region: "부산",
    type: "정통룸싸롱 · 비즈니스룸",
    addr: "부산 해운대구 마린시티",
    hours: "오후 7시 ~ 새벽 5시",
    tags: ["10년전통", "룸60개+", "해운대1등", "대형"]
  },
  {
    name: "해운대 오션",
    region: "부산",
    type: "룸싸롱",
    addr: "부산 해운대구",
    hours: "오후 7시 ~ 새벽 5시",
    tags: ["해운대", "대형"]
  },
  {
    name: "서면 갤러리",
    region: "부산",
    type: "룸싸롱",
    addr: "부산 부산진구 부전동 서면역 인근",
    hours: "오후 7시 ~ 새벽",
    tags: ["서면", "대형"]
  },
  {
    name: "서면 카카오",
    region: "부산",
    type: "룸싸롱",
    addr: "부산 부산진구 부전동",
    hours: "오후 7시 ~ 새벽",
    tags: ["서면"]
  },
  {
    name: "서면 신세계",
    region: "부산",
    type: "룸싸롱",
    addr: "부산 부산진구 부전동",
    hours: "오후 7시 ~ 새벽",
    tags: ["서면"]
  },
  {
    name: "서면 인스타",
    region: "부산",
    type: "룸싸롱",
    addr: "부산 부산진구 부전동",
    hours: "오후 7시 ~ 새벽",
    tags: ["서면"]
  },
  {
    name: "서면 아우토반",
    region: "부산",
    type: "룸싸롱",
    addr: "부산 부산진구 부전동",
    hours: "오후 7시 ~ 새벽",
    tags: ["서면"]
  },
  {
    name: "서면 보물섬",
    region: "부산",
    type: "룸싸롱",
    addr: "부산 부산진구 부전동",
    hours: "오후 7시 ~ 새벽",
    tags: ["서면"]
  },

  // ──────────── 대구 ────────────
  {
    name: "더대구룸",
    region: "대구",
    type: "1종유흥 · 프리미엄 룸",
    addr: "대구 수성구",
    hours: "오후 6시 ~ 새벽",
    tags: ["수성구", "1종유흥", "고급인테리어"]
  },
  {
    name: "대구 투데이",
    region: "대구",
    type: "프리미엄 비즈니스룸",
    addr: "대구 수성구 황금동 · 동대구역",
    hours: "오후 6시 ~ 새벽",
    tags: ["룸62개", "대구최초", "프리미엄"]
  },
  {
    name: "대구 넘버원",
    region: "대구",
    type: "프리미엄 룸싸롱",
    addr: "대구 동대구 신천동",
    hours: "오후 6시 ~ 새벽",
    tags: ["동대구", "프리미엄"]
  },
  {
    name: "대구 2NE1",
    region: "대구",
    type: "풀싸롱 · 룸",
    addr: "대구 수성구",
    hours: "오후 6시 ~ 새벽",
    tags: ["수성구", "풀싸롱"]
  },

  // ──────────── 인천 ────────────
  {
    name: "인천 텐프로룸",
    region: "인천",
    type: "텐프로 · 룸싸롱",
    addr: "인천 정자역 인근",
    hours: "24시간 예약 가능",
    tags: ["텐프로", "예약제"]
  },
  {
    name: "대식이 (쓰리노)",
    region: "인천",
    type: "쓰리노 · 퍼블릭",
    addr: "인천 연수동 · 동인천 · 삼산동",
    hours: "오후 7시~ · 100분제",
    tags: ["쓰리노", "다지점", "100분제"]
  },
  {
    name: "MU퍼블릭",
    region: "인천",
    type: "셔츠룸 · 하이퍼블릭 · 쓰리노",
    addr: "인천 · 부천 4개 지점",
    hours: "매일 저녁영업",
    tags: ["4개지점", "인천부천"]
  },
  {
    name: "인천 엘로우",
    region: "인천",
    type: "가라오케 · 노래방",
    addr: "인천",
    hours: "100% 예약제 · 정찰제",
    tags: ["예약제", "정찰제"]
  },

  // ──────────── 수원 ────────────
  {
    name: "수원룸싸롱 이수근",
    region: "수원",
    type: "퍼블릭룸 · 가라오케",
    addr: "수원시 팔달구 인계동",
    hours: "오후 6시 ~ 새벽 5시",
    tags: ["룸60개+", "인계동", "대형"]
  },
  {
    name: "수원 풀싸롱",
    region: "수원",
    type: "풀싸롱 · 가라오케 · 셔츠룸",
    addr: "수원시 팔달구 인계동",
    hours: "24시간 영업",
    tags: ["24시간", "인계동", "풀싸롱"]
  },
  {
    name: "수원룸싸롱 김실장",
    region: "수원",
    type: "퍼블릭룸 · 셔츠룸 · 레깅스룸",
    addr: "수원시 영통구 · 인계동",
    hours: "매일 저녁영업",
    tags: ["영통", "인계동", "다양한룸"]
  },

  // ──────────── 대전 ────────────
  {
    name: "대전 알라딘룸",
    region: "대전",
    type: "노래주점 · 룸",
    addr: "대전 유성구",
    hours: "오후 6시 ~ 새벽 6시",
    tags: ["유성", "노래주점"]
  },
  {
    name: "대전 타이밍룸",
    region: "대전",
    type: "룸싸롱 · 퍼블릭룸",
    addr: "대전 유성구",
    hours: "매일 저녁영업",
    tags: ["유성", "퍼블릭"]
  },
  {
    name: "대전룸 이부장",
    region: "대전",
    type: "풀싸롱 · 룸싸롱",
    addr: "대전 유성구",
    hours: "매일 저녁영업",
    tags: ["유성", "풀싸롱"]
  },

  // ──────────── 광주 ────────────
  {
    name: "광주 상무지구 룸싸롱",
    region: "광주",
    type: "정통룸 · 1종유흥",
    addr: "광주 서구 상무지구 치평동",
    hours: "365일 · 오후 7시 20분~",
    tags: ["상무지구", "1종유흥", "365일"]
  },
  {
    name: "광주 노래홀",
    region: "광주",
    type: "가라오케 · 퍼블릭",
    addr: "광주 서구 상무지구",
    hours: "매일 저녁영업",
    tags: ["상무지구", "가라오케"]
  },
  {
    name: "광주 잼투잼",
    region: "광주",
    type: "룸싸롱",
    addr: "광주 서구 상무지구",
    hours: "매일 저녁영업",
    tags: ["상무지구", "룸싸롱"]
  },

  // ──────────── 전주 ────────────
  {
    name: "전주 음악홀",
    region: "전주",
    type: "음악홀 · 룸",
    addr: "전주 중화산동 · 아중리 · 신시가지",
    hours: "오후 7시 30분 ~ 새벽 2시 · 365일",
    tags: ["음악홀", "365일", "다지점"]
  },
  {
    name: "전주 릴렉스룸",
    region: "전주",
    type: "룸싸롱 · 음악홀",
    addr: "전주 완산구",
    hours: "매일 저녁영업",
    tags: ["전주", "릴렉스"]
  },

  // ──────────── 울산 ────────────
  {
    name: "울산 프리미엄 에디션",
    region: "울산",
    type: "정통룸 · 가라오케",
    addr: "울산 남구 삼산동",
    hours: "매일 저녁영업",
    tags: ["삼산동", "프리미엄", "정통룸"]
  },
  {
    name: "울산 삼산동룸",
    region: "울산",
    type: "퍼블릭 · 가라오케 · 노래방",
    addr: "울산 남구 삼산동",
    hours: "매일 저녁영업",
    tags: ["삼산동", "퍼블릭", "가라오케"]
  },

  // ──────────── 창원 ────────────
  {
    name: "창원룸싸롱",
    region: "창원",
    type: "룸싸롱 · 가라오케",
    addr: "경남 창원시 의창구",
    hours: "매일 저녁영업",
    tags: ["창원", "가라오케"]
  },

  // ──────────── 김해 ────────────
  {
    name: "김해 룸싸롱",
    region: "김해",
    type: "퍼블릭 · 가라오케",
    addr: "경남 김해시 내외동",
    hours: "24시간 영업 · 정찰제",
    tags: ["내외동", "24시간", "정찰제"]
  },

  // ──────────── 천안 ────────────
  {
    name: "천안 룸싸롱",
    region: "천안",
    type: "룸싸롱 · 가라오케",
    addr: "충남 천안시",
    hours: "365일 연중무휴",
    tags: ["365일", "연중무휴"]
  },

  // ──────────── 청주 ────────────
  {
    name: "청주 노래궁",
    region: "청주",
    type: "노래주점 · 룸",
    addr: "충북 청주시",
    hours: "매일 저녁영업",
    tags: ["19년전통", "노래궁"]
  },
  {
    name: "청주 야구장",
    region: "청주",
    type: "룸싸롱",
    addr: "충북 청주시",
    hours: "매일 저녁영업",
    tags: ["청주", "룸싸롱"]
  },

  // ──────────── 제주 ────────────
  {
    name: "제주 VIP 풀룸",
    region: "제주",
    type: "풀룸 · 정통룸싸롱",
    addr: "제주 제주시",
    hours: "365일 24시간 · 100% 예약제 · 정찰제",
    tags: ["VIP", "예약제", "정찰제", "365일"]
  },
  {
    name: "제주 신호등",
    region: "제주",
    type: "룸싸롱 · 유흥",
    addr: "제주 제주시",
    hours: "매일 저녁영업",
    tags: ["제주", "룸싸롱"]
  },
  {
    name: "제주밤 셔츠룸",
    region: "제주",
    type: "셔츠룸 · 퍼블릭 · 가라오케",
    addr: "제주 제주시 연동",
    hours: "매일 저녁영업",
    tags: ["연동", "셔츠룸", "가라오케"]
  },
];


/* ======= DOM ======= */
const grid = document.getElementById("grid");
const searchInput = document.getElementById("searchInput");
const filtersEl = document.getElementById("filters");
const listingCount = document.getElementById("listingCount");
const noResults = document.getElementById("noResults");
const featuredCard = document.querySelector(".featured-card");

let activeRegion = "all";

/* ======= RENDER ======= */
function renderCard(item) {
  const tagsHTML = item.tags.map(t => `<span class="card-tag">${t}</span>`).join("");
  return `
    <article class="card" data-region="${item.region}">
      <div class="card-header">
        <h3 class="card-name">${item.name}</h3>
        <span class="card-region">${item.region}</span>
      </div>
      <p class="card-type">${item.type}</p>
      <p class="card-addr">${item.addr}</p>
      <p class="card-hours">${item.hours}</p>
      <div class="card-tags">${tagsHTML}</div>
    </article>`;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = listings.filter(item => {
    const regionMatch = activeRegion === "all" || item.region === activeRegion;
    if (!regionMatch) return false;
    if (!query) return true;
    const haystack = `${item.name} ${item.region} ${item.type} ${item.addr} ${item.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query);
  });

  grid.innerHTML = filtered.map(renderCard).join("");
  listingCount.textContent = `총 ${filtered.length}개 업소`;
  noResults.style.display = filtered.length === 0 ? "block" : "none";

  // Featured card visibility
  if (featuredCard) {
    const showFeatured = (activeRegion === "all" || activeRegion === "일산") &&
      (!query || "일산 명월관 요정 비즈니스룸 가라오케".includes(query));
    featuredCard.closest(".featured-section").style.display = showFeatured ? "block" : "none";
  }
}

/* ======= EVENTS ======= */
filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  filtersEl.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeRegion = btn.dataset.region;
  render();
});

searchInput.addEventListener("input", render);

/* ======= INIT ======= */
render();
