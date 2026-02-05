const form = document.getElementById("lunchForm");
const previewBtn = document.getElementById("previewBtn");
const resultCards = document.getElementById("resultCards");

const toast = document.createElement("div");
toast.className = "toast";
toast.setAttribute("role", "status");
toast.setAttribute("aria-live", "polite");
document.body.appendChild(toast);

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
};

const menus = [
  {
    name: "매콤제육 덮밥",
    tags: "든든 · 매콤 · 한식",
    vibe: "매콤하게",
  },
  {
    name: "닭곰탕",
    tags: "국물 · 든든 · 한식",
    vibe: "든든하게",
  },
  {
    name: "연어 포케",
    tags: "가벼움 · 신선 · 양식",
    vibe: "가벼운 점심",
  },
  {
    name: "냉모밀 세트",
    tags: "시원 · 일식 · 깔끔",
    vibe: "깔끔하게",
  },
  {
    name: "명란크림 파스타",
    tags: "부드러움 · 양식 · 기분전환",
    vibe: "가벼운 점심",
  },
  {
    name: "비빔국수 + 미니만두",
    tags: "상큼 · 분식 · 가성비",
    vibe: "가벼운 점심",
  },
  {
    name: "규동",
    tags: "담백 · 일식 · 든든",
    vibe: "든든하게",
  },
  {
    name: "얼큰순대국",
    tags: "뜨끈 · 매콤 · 국물",
    vibe: "매콤하게",
  },
];

const renderCards = (picked, name, mood, budget) => {
  if (!resultCards) return;
  resultCards.innerHTML = "";

  picked.forEach((menu, index) => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <span class="result-tag">추천 ${index + 1}</span>
      <h4>${menu.name}</h4>
      <p>${menu.tags}</p>
      <p class="result-tag">${name}님 · ${mood} · ${budget}</p>
    `;
    resultCards.appendChild(card);
  });
};

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get("name") || "고객";
    const budget = formData.get("budget") || "예산 미입력";
    const mood = formData.get("mood") || "가벼운 점심";

    const filtered = menus.filter((menu) => menu.vibe === mood);
    const pool = filtered.length ? filtered : menus;
    const picked = pool.sort(() => 0.5 - Math.random()).slice(0, 3);

    renderCards(picked, name, mood, budget);
    showToast(`${name}님을 위한 점심 메뉴 3가지를 추천했어요.`);
    document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
  });
}

if (previewBtn) {
  previewBtn.addEventListener("click", () => {
    showToast("기분 → 예산 → 취향 → 추천 카드 순으로 바로 안내됩니다.");
  });
}
