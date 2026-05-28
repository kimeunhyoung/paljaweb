/** 앱인토스 콘솔 → 인앱 광고 → 배너 광고 그룹 ID (타로코드_상단배너) */
export const TOSS_BANNER_AD_GROUP =
  (import.meta.env.VITE_TOSS_AD_GROUP as string | undefined)?.trim() ||
  "ait.v2.live.a0b05a8e5a6c4135";

/**
 * 전면형 광고 그룹 ID — 콘솔에서 「전면형」으로 새 그룹 생성 후 .env 또는 아래에 입력.
 * 비어 있으면 「새로운 리딩」 시 광고 없이 바로 리셋합니다.
 */
export const TOSS_INTERSTITIAL_AD_GROUP =
  (import.meta.env.VITE_TOSS_AD_INTERSTITIAL as string | undefined)?.trim() ||
  "ait.v2.live.ff01df430d4e47ba";
