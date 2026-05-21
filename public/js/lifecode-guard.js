/**
 * ?lifecode=1 일 때만 세션 검사 (팔자연구소 일반 /analysis.html 은 영향 없음)
 */
(function lifecodeGuard() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lifecode') !== '1') return;

  document.documentElement.classList.add('lifecode-standalone');

  const STORAGE_KEY = 'lifecode_device_id';
  function getDeviceId() {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  }

  document.documentElement.classList.add('lifecode-guard-pending');

  fetch(`/api/lifecode/session?deviceId=${encodeURIComponent(getDeviceId())}`, {
    credentials: 'include',
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) {
        document.documentElement.classList.remove('lifecode-guard-pending');
        return;
      }
      window.location.replace('/lifecode/');
    })
    .catch(() => {
      window.location.replace('/lifecode/');
    });
})();
