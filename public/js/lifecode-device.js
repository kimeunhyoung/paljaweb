/** 라이프코드 단품 — 기기 ID (localStorage, 1코드 1기기) */
export const LIFECODE_DEVICE_KEY = 'lifecode_device_id';

export function getLifecodeDeviceId() {
  let id = localStorage.getItem(LIFECODE_DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LIFECODE_DEVICE_KEY, id);
  }
  return id;
}
