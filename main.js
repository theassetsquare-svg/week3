const pickBtn = document.getElementById("pickBtn");
const result = document.getElementById("result");
const resultMedia = document.getElementById("resultMedia");
const resultTitle = document.getElementById("resultTitle");
const resultTags = document.getElementById("resultTags");
const menuGrid = document.getElementById("menuGrid");

const menus = [
  {
    name: "비빔밥",
    tags: "담백 · 한식 · 든든",
    image:
      "https://images.unsplash.com/photo-1628441309764-794e7362f6e6?fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "제육덮밥",
    tags: "매콤 · 한식 · 든든",
    image:
      "https://images.unsplash.com/photo-1628441309764-794e7362f6e6?fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "라멘",
    tags: "국물 · 일식 · 진한맛",
    image:
      "https://images.unsplash.com/photo-1749957596854-a692b13e419d?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "쌀국수",
    tags: "가벼움 · 국물 · 베트남",
    image:
      "https://images.unsplash.com/photo-1749957596854-a692b13e419d?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "카레라이스",
    tags: "따뜻 · 향신 · 든든",
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "돈까스",
    tags: "바삭 · 든든 · 일식",
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "파스타",
    tags: "크리미 · 양식 · 기분전환",
    image:
      "https://images.unsplash.com/photo-1691775755616-7de92be6b56a?fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "샐러드볼",
    tags: "가벼움 · 신선 · 건강",
    image:
      "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "비빔국수",
    tags: "상큼 · 분식 · 가성비",
    image:
      "https://images.unsplash.com/photo-1691775755616-7de92be6b56a?fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "냉모밀",
    tags: "시원 · 일식 · 깔끔",
    image:
      "https://images.unsplash.com/photo-1749957596854-a692b13e419d?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "불고기정식",
    tags: "고기 · 한식 · 든든",
    image:
      "https://images.unsplash.com/photo-1628441309764-794e7362f6e6?fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
  {
    name: "샌드위치",
    tags: "간편 · 가벼움 · 테이크아웃",
    image:
      "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
  },
];

const renderMenuGrid = () => {
  menuGrid.innerHTML = "";
  menus.forEach((menu, index) => {
    const card = document.createElement("article");
    card.className = "menu-card";
    card.dataset.index = index.toString();
    card.innerHTML = `
      <img src="${menu.image}" alt="${menu.name}" loading="lazy" />
      <div class="menu-body">
        <h3>${menu.name}</h3>
        <p>${menu.tags}</p>
      </div>
    `;
    menuGrid.appendChild(card);
  });
};

const pickMenu = () => {
  const selected = menus[Math.floor(Math.random() * menus.length)];
  const cards = menuGrid.querySelectorAll(".menu-card");
  cards.forEach((card) => card.classList.remove("is-selected"));

  const selectedIndex = menus.indexOf(selected);
  const selectedCard = menuGrid.querySelector(`[data-index="${selectedIndex}"]`);
  selectedCard?.classList.add("is-selected");

  resultMedia.style.backgroundImage = `url('${selected.image}')`;
  resultTitle.textContent = selected.name;
  resultTags.textContent = selected.tags;
};

renderMenuGrid();

pickBtn.addEventListener("click", () => {
  pickMenu();
  result.scrollIntoView({ behavior: "smooth" });
});
