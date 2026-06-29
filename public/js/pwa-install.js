// 팔자연구소 PWA 설치 유도 — 브라우저 기본 안내는 숨기고, 의도된 "앱 설치" 칩만 노출
(function () {
  // 이미 앱으로 실행 중이면 표시하지 않음
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (standalone) return;

  const DISMISS_KEY = 'palja:pwaInstallDismissed';
  let deferredPrompt = null;

  function injectStyle() {
    if (document.getElementById('pwaInstallStyle')) return;
    const css = `
      #pwaInstallChip{position:fixed;left:16px;bottom:16px;z-index:2147483000;
        display:flex;align-items:center;gap:2px;
        background:#fff;border:1px solid rgba(61,43,31,.16);
        border-radius:999px;box-shadow:0 6px 20px rgba(61,43,31,.18);
        padding:4px 4px 4px 6px;animation:pwaChipIn .25s ease both;}
      #pwaInstallBtn{display:flex;align-items:center;gap:7px;border:0;cursor:pointer;
        background:#c4603a;color:#fff;font-weight:700;font-size:14px;
        border-radius:999px;padding:9px 14px;line-height:1;
        font-family:inherit;}
      #pwaInstallBtn .pwa-ic{font-size:15px;}
      #pwaInstallClose{border:0;background:transparent;cursor:pointer;
        color:#9b7b6a;font-size:18px;line-height:1;padding:6px 9px;border-radius:999px;}
      #pwaInstallClose:hover{background:rgba(61,43,31,.06);}
      @keyframes pwaChipIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      @media (max-width:480px){#pwaInstallChip{left:12px;right:12px;bottom:12px;justify-content:space-between;}}
    `;
    const style = document.createElement('style');
    style.id = 'pwaInstallStyle';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showChip() {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    if (document.getElementById('pwaInstallChip')) return;
    injectStyle();
    const chip = document.createElement('div');
    chip.id = 'pwaInstallChip';
    chip.innerHTML =
      '<button type="button" id="pwaInstallBtn"><span class="pwa-ic">⬇</span><span>앱 설치</span></button>' +
      '<button type="button" id="pwaInstallClose" aria-label="닫기">×</button>';
    document.body.appendChild(chip);

    document.getElementById('pwaInstallBtn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (e) {}
      deferredPrompt = null;
      removeChip();
    });
    document.getElementById('pwaInstallClose').addEventListener('click', () => {
      try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
      removeChip();
    });
  }

  function removeChip() {
    const chip = document.getElementById('pwaInstallChip');
    if (chip) chip.remove();
  }

  // 브라우저 기본 설치 안내를 막고, 우리 칩으로 대체
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showChip();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    removeChip();
  });
})();
