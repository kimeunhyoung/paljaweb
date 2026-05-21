/**
 * /lifecode/ 단품 전용 페이지 세션 가드 (index·admin 제외)
 */
(function lifecodeProductGuard() {
  const path = window.location.pathname || '';
  if (!path.includes('/lifecode/')) return;
  if (/\/lifecode\/?$/.test(path) || path.includes('admin.html')) return;

  document.documentElement.classList.add('lifecode-guard-pending');

  const key = 'lifecode_device_id';
  function deviceId() {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }

  fetch(`/api/lifecode/session?deviceId=${encodeURIComponent(deviceId())}`, {
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
