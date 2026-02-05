const pickBtn = document.getElementById("pickBtn");
const resultImage = document.getElementById("resultImage");
const resultText = document.getElementById("resultText");

const menus = [
  {
    name: "김치찌개",
    image:
      "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "제육덮밥",
    image:
      "https://images.unsplash.com/photo-1628441309764-794e7362f6e6?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "돈까스",
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "비빔국수",
    image:
      "https://images.unsplash.com/photo-1691775755616-7de92be6b56a?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "쌀국수",
    image:
      "https://images.unsplash.com/photo-1749957596854-a692b13e419d?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "라멘",
    image:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "파스타",
    image:
      "https://images.unsplash.com/photo-1523986371872-9d3ba2e2f5f9?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "샐러드볼",
    image:
      "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "불고기정식",
    image:
      "https://images.unsplash.com/photo-1628441309764-794e7362f6e6?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "카레",
    image:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "냉모밀",
    image:
      "https://images.unsplash.com/photo-1749957596854-a692b13e419d?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "국밥",
    image:
      "https://images.unsplash.com/photo-1628441309764-794e7362f6e6?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "찜닭",
    image:
      "https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "짜장면",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
  {
    name: "초밥",
    image:
      "https://images.unsplash.com/photo-1546069901-eacef0df6022?auto=format&fit=crop&fm=jpg&q=60&w=1200",
  },
];

const pickMenu = () => {
  const pick = menus[Math.floor(Math.random() * menus.length)];
  resultImage.style.backgroundImage = `url('${pick.image}')`;
  resultText.textContent = `오늘의 추천 메뉴: ${pick.name}`;
};

pickBtn.addEventListener("click", pickMenu);
