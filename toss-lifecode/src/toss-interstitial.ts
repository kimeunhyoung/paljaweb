import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";

/** 「나의 수비학 확인하기」용 전면 광고 — 미리 로드 후 show() */
export function createRunInterstitial(adGroupId: string) {
  let unregister: (() => void) | null = null;
  let loaded = false;

  const reload = () => {
    loaded = false;
    try {
      unregister?.();
    } catch {
      /* ignore */
    }
    unregister = null;

    if (!adGroupId || !loadFullScreenAd.isSupported()) return;

    try {
      unregister = loadFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === "loaded") loaded = true;
        },
        onError: () => {
          loaded = false;
        },
      });
    } catch {
      loaded = false;
    }
  };

  reload();

  function show(): Promise<void> {
    return new Promise((resolve) => {
      if (!adGroupId || !loadFullScreenAd.isSupported() || !loaded) {
        resolve();
        return;
      }

      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        reload();
        resolve();
      };

      // 광고가 안 닫히면 결과 막히지 않도록
      const failSafe = window.setTimeout(done, 20000);

      try {
        showFullScreenAd({
          options: { adGroupId },
          onEvent: (event) => {
            if (event.type === "dismissed" || event.type === "failedToShow") {
              window.clearTimeout(failSafe);
              done();
            }
          },
          onError: () => {
            window.clearTimeout(failSafe);
            done();
          },
        });
      } catch {
        window.clearTimeout(failSafe);
        done();
      }
    });
  }

  return {
    show,
    destroy: () => {
      try {
        unregister?.();
      } catch {
        /* ignore */
      }
      unregister = null;
    },
  };
}
