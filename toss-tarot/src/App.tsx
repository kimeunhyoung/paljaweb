import { useEffect, useRef } from "react";

import "./App.css";
import { TOSS_INTERSTITIAL_AD_GROUP } from "./toss-ad-group";
import { createResetInterstitial } from "./toss-interstitial";

/** 토스 WebView: 상대 URL, partner 내비는 granite 가 제공 */
function tarotPageUrl() {
  const q = "standalone=1&app=1";
  try {
    return new URL(`Tarot.html?${q}`, window.location.href).href;
  } catch {
    return `Tarot.html?${q}`;
  }
}

function App() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const interstitial = createResetInterstitial(TOSS_INTERSTITIAL_AD_GROUP);

    const onMessage = async (ev: MessageEvent) => {
      if (!ev.data || ev.data.source !== "paljaweb-tarot") return;
      if (ev.data.type !== "new-reading-ad") return;

      try {
        await interstitial.show();
      } finally {
        frameRef.current?.contentWindow?.postMessage(
          { source: "paljaweb-tarot", type: "new-reading-continue" },
          "*",
        );
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      interstitial.destroy();
    };
  }, []);

  return (
    <div className="tarot-shell">
      <iframe
        ref={frameRef}
        className="tarot-shell__frame"
        title="팔자연구소 · 타로코드"
        src={tarotPageUrl()}
      />
    </div>
  );
}

export default App;
