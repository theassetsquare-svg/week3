const form = document.getElementById("inquiryForm");
const previewBtn = document.getElementById("previewBtn");

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

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get("name");
    showToast(`${name || "고객"}님 문의가 접수되었습니다. 곧 연락드릴게요.`);
    form.reset();
  });
}

if (previewBtn) {
  previewBtn.addEventListener("click", () => {
    showToast("문의 → 분류 → 상담 → 방문 예약 → 후속 케어 흐름으로 운영됩니다.");
  });
}
