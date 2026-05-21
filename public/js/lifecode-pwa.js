/** 라이프코드 단품 PWA — 홈 화면 전용 아이콘·standalone 설치 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/lifecode/sw.js', { scope: '/lifecode/' })
      .catch(() => {});
  });
}
