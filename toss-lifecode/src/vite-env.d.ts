/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 비우면 기본: https://8code.kr/lifecode-play/?source=toss */
  readonly VITE_LIFECODE_PAGE_URL?: string;
  /** 상단 배너 — 기본: 수비학lite상단배너 */
  readonly VITE_TOSS_AD_GROUP?: string;
  /** 전면형 — 기본: 수비학lite전면형 */
  readonly VITE_TOSS_AD_INTERSTITIAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
