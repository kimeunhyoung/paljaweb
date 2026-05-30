import { TossAds } from "@apps-in-toss/web-framework";

import {
  TOSS_BANNER_AD_GROUP,
  TOSS_INTERSTITIAL_AD_GROUP,
} from "./toss-ad-group";
import { createResetInterstitial } from "./toss-interstitial";

const MSG = "paljaweb-tarot";

/** 번들 내 상대 경로(기본). Render URL 로 테스트하려면 .env 에 VITE_TAROT_PAGE_URL 설정 */
const DEFAULT_QUERY = "standalone=1&app=1";
const REMOTE =
  "https://paljaweb.onrender.com/Tarot.html?" + DEFAULT_QUERY;

function resolveTarotUrl(): string {
  const fromEnv = import.meta.env.VITE_TAROT_PAGE_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  try {
    return new URL(`Tarot.html?${DEFAULT_QUERY}`, window.location.href).href;
  } catch {
    return REMOTE;
  }
}

function mountTossBanner(host: HTMLElement, adGroupId: string) {
  if (!adGroupId) return;

  let attached: { destroy: () => void } | null = null;
  let cancelled = false;

  const attach = () => {
    if (cancelled || !host.isConnected) return;
    if (!TossAds?.attachBanner?.isSupported?.()) return;

    host.innerHTML = "";
    host.style.width = "100%";
    host.style.minHeight = "96px";

    attached = TossAds.attachBanner(adGroupId, host, {
      theme: "auto",
      tone: "grey",
      variant: "expanded",
      callbacks: {
        onAdRendered: () => {
          if (!cancelled) host.classList.add("is-active");
        },
        onNoFill: () => {
          console.warn("[toss-tarot] banner no fill");
        },
        onAdFailedToRender: (p) => {
          console.warn("[toss-tarot] banner render failed", p?.error);
        },
      },
    });
  };

  const boot = () => {
    if (cancelled) return;
    try {
      if (!TossAds?.initialize?.isSupported?.()) {
        console.warn("[toss-tarot] TossAds not supported in this environment");
        return;
      }
      TossAds.initialize({
        callbacks: {
          onInitialized: attach,
          onInitializationFailed: (err) => {
            console.error("[toss-tarot] TossAds init failed", err);
          },
        },
      });
    } catch (err) {
      console.warn("[toss-tarot] TossAds boot skipped", err);
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
    attached = null;
    try {
      TossAds?.destroyAll?.();
    } catch {
      /* ignore */
    }
  };
}

function postResetContinue(frame: HTMLIFrameElement) {
  frame.contentWindow?.postMessage(
    { source: MSG, type: "new-reading-continue" },
    "*",
  );
}

const frame = document.getElementById("tarot-frame");
const interstitial = TOSS_INTERSTITIAL_AD_GROUP
  ? createResetInterstitial(TOSS_INTERSTITIAL_AD_GROUP)
  : null;

if (frame instanceof HTMLIFrameElement) {
  frame.src = resolveTarotUrl();

  window.addEventListener("message", (ev) => {
    if (ev.data?.source !== MSG || ev.data?.type !== "new-reading-ad") return;
    if (ev.source !== frame.contentWindow) return;

    const run = async () => {
      if (interstitial) {
        await interstitial.show();
      }
      postResetContinue(frame);
    };

    void run();
  });
}

const bannerHost = document.getElementById("toss-banner-host");
if (bannerHost instanceof HTMLElement) {
  mountTossBanner(bannerHost, TOSS_BANNER_AD_GROUP);
}
