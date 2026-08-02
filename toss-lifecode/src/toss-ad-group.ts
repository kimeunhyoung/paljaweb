/**
 * 앱인토스 콘솔 → 수익화 → 인앱 광고
 * 수비학lite상단배너 / 수비학lite전면형
 */
export const TOSS_BANNER_AD_GROUP =
  (import.meta.env.VITE_TOSS_AD_GROUP as string | undefined)?.trim() ||
  "ait.v2.live.dba17bf3f3234811";

export const TOSS_INTERSTITIAL_AD_GROUP =
  (import.meta.env.VITE_TOSS_AD_INTERSTITIAL as string | undefined)?.trim() ||
  "ait.v2.live.c9265b6a59f84ea8";
