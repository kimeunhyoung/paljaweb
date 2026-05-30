import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * 헤더 아래 리스트형 배너 (인앱 광고 2.0 ver2)
 * @see https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B4%91%EA%B3%A0/BannerAd.html
 */
export function useTossBanner(
  containerRef: RefObject<HTMLDivElement | null>,
  adGroupId: string,
) {
  const [ready, setReady] = useState(false);
  const attachedRef = useRef<{ destroy: () => void } | null>(null);
  const initStarted = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !adGroupId) return;

    let cancelled = false;

    const attach = () => {
      if (cancelled || !containerRef.current) return;
      if (!TossAds?.attachBanner?.isSupported?.()) return;

      el.innerHTML = "";
      el.style.width = "100%";
      el.style.minHeight = "96px";

      attachedRef.current = TossAds.attachBanner(adGroupId, el, {
        theme: "auto",
        tone: "grey",
        variant: "expanded",
        callbacks: {
          onAdRendered: () => {
            if (!cancelled) setReady(true);
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
      if (cancelled || initStarted.current) return;
      try {
        if (!TossAds?.initialize?.isSupported?.()) {
          console.warn("[toss-tarot] TossAds not supported");
          return;
        }
        initStarted.current = true;
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
        attachedRef.current?.destroy();
      } catch {
        /* ignore */
      }
      attachedRef.current = null;
      try {
        TossAds?.destroyAll?.();
      } catch {
        /* ignore */
      }
    };
  }, [adGroupId, containerRef]);

  return { ready };
}
