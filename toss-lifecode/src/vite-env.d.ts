/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 비우면 기본: https://8code.kr/lifecode-play/?source=toss */
  readonly VITE_LIFECODE_PAGE_URL?: string;
  readonly VITE_TOSS_AD_GROUP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
