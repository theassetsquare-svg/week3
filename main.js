const pickBtn = document.getElementById("pickBtn");
const result = document.getElementById("result");

const menus = [
  "김치찌개",
  "제육덮밥",
  "돈까스",
  "비빔국수",
  "쌀국수",
  "라멘",
  "파스타",
  "샐러드볼",
  "불고기정식",
  "카레",
  "냉모밀",
  "국밥",
  "찜닭",
  "짜장면",
  "초밥",
];

pickBtn.addEventListener("click", () => {
  const pick = menus[Math.floor(Math.random() * menus.length)];
  result.textContent = `오늘의 추천 메뉴: ${pick}`;
});
