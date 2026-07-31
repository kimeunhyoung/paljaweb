import { TossAds } from "@apps-in-toss/web-framework";

const DEFAULT_QUERY = "source=toss";
/** 운영: 항상 최신 Lite + 사이트 유입 링크가 동작하도록 기본은 8code.kr */
const REMOTE =
  "https://8code.kr/lifecode-play/?" + DEFAULT_QUERY;

function resolveLiteUrl(): string {
  const fromEnv = import.meta.env.VITE_LIFECODE_PAGE_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  // 로컬 번들 테스트: ?local=1
  try {
    if (new URLSearchParams(window.location.search).get("local") === "1") {
      return new URL(
        `lifecode-play/index.html?${DEFAULT_QUERY}`,
        window.location.href,
      ).href;
    }
  } catch {
    /* ignore */
  }
  return REMOTE;
}

function mountTossBanner(host: HTMLElement, adGroupId: string) {
  if (!adGroupId) return () => {};

  let attached: { destroy: () => void } | null = null;
  let cancelled = false;

  const attach = () => {
    if (cancelled || !host.isConnected) return;
    if (!TossAds?.attachBanner?.isSupported?.()) return;

    host.innerHTML = "";
    host.style.width = "100%";
    host.style.minHeight = "96px";

    attached = TossAds.attachBanner(adGroupId, host, {
      theme: "dark",
      tone: "grey",
      variant: "expanded",
      callbacks: {
        onAdRendered: () => {
          if (!cancelled) host.classList.add("is-active");
        },
        onNoFill: () => {
          console.warn("[toss-lifecode] banner no fill");
        },
        onAdFailedToRender: (p) => {
          console.warn("[toss-lifecode] banner render failed", p?.error);
        },
      },
    });
  };

  const boot = () => {
    if (cancelled) return;
    try {
      if (!TossAds?.initialize?.isSupported?.()) {
        console.warn("[toss-lifecode] TossAds not supported");
        return;
      }
      TossAds.initialize({
        callbacks: {
          onInitialized: attach,
          onInitializationFailed: (err) => {
            console.error("[toss-lifecode] TossAds init failed", err);
          },
        },
      });
    } catch (err) {
      console.warn("[toss-lifecode] TossAds boot skipped", err);
    }
  };

  const t = window.setTimeout(boot, 300);
  return () => {
    cancelled = true;
    window.clearTimeout(t);
    try {
      attached?.destroy();
    } catch {
      /* ignore */
    }
  };
}

const frame = document.getElementById("lite-frame");
if (frame instanceof HTMLIFrameElement) {
  frame.src = resolveLiteUrl();
}

const bannerHost = document.getElementById("toss-banner-host");
const adGroup = (import.meta.env.VITE_TOSS_AD_GROUP as string | undefined)?.trim() || "";
if (bannerHost instanceof HTMLElement && adGroup) {
  mountTossBanner(bannerHost, adGroup);
}
