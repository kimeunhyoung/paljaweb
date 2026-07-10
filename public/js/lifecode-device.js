/** 라이프코드·체험 — 브라우저 기기 ID (localStorage, 계정당 최대 4대) */
export const LIFECODE_DEVICE_KEY = 'lifecode_device_id';

export function getLifecodeDeviceId() {
  let id = localStorage.getItem(LIFECODE_DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LIFECODE_DEVICE_KEY, id);
  }
  return id;
}
