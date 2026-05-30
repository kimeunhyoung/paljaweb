import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@apps-in-toss/web-framework/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 앱인토스 콘솔 → 앱 정보 → 아이콘 우클릭 → 링크 복사 → brand-icon.url 또는 TOSS_BRAND_ICON_URL */
function brandIconUrl(): string {
  const fromEnv = process.env.TOSS_BRAND_ICON_URL?.trim();
  if (fromEnv?.startsWith("https://")) return fromEnv;

  const urlFile = resolve(__dirname, "brand-icon.url");
  if (existsSync(urlFile)) {
    const line = readFileSync(urlFile, "utf8").trim().split(/\r?\n/)[0]?.trim();
    if (line?.startsWith("https://")) return line;
  }

  console.warn(
    "[granite] brand.icon 비어 있음 — brand-icon.url 또는 TOSS_BRAND_ICON_URL 설정 권장 (콘솔 등록 아이콘과 동일 URL)",
  );
  return "";
}

export default defineConfig({
  appName: "tarotcode",
  brand: {
    displayName: "타로코드",
    primaryColor: "#8b6f47",
    icon: brandIconUrl(),
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
  webViewProps: {
    type: "partner",
    bounces: true,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: false,
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
