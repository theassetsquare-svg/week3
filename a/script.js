/* ── 수유샴푸나이트 안내 페이지 스크립트 ── */
(function () {
  'use strict';

  /* 1) FAQ 아코디언 */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.faq-item');
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (el) {
        el.classList.remove('open');
      });
      if (!isOpen) item.classList.add('open');
    });
  });

  /* 2) 스텝퍼 현재 단계 강조 (Intersection Observer) */
  var stepItems = document.querySelectorAll('.stepper__item');
  var sections = document.querySelectorAll('.section[data-step]');

  if ('IntersectionObserver' in window && sections.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var step = entry.target.getAttribute('data-step');
          stepItems.forEach(function (si) {
            si.classList.toggle('active', si.getAttribute('data-step') === step);
          });
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

    sections.forEach(function (sec) { observer.observe(sec); });
  }

  /* 3) 안전장치: 본문 이미지에서 og-image.jpg 자동 제외 */
  document.querySelectorAll('.content img').forEach(function (img) {
    var src = img.getAttribute('src') || '';
    if (src.indexOf('og-image') !== -1) {
      img.parentNode.removeChild(img);
    }
  });

})();
