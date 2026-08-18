package kr.co.palja.app;

import android.app.Activity;
import android.util.Log;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

/** AdMob 전면 — 확인하기 직후 1회 */
public class PlayAdManager {
    private static final String TAG = "PlayAdManager";
    static final String INTERSTITIAL_UNIT = "ca-app-pub-7451075921625740/6850904792";

    private InterstitialAd interstitialAd;
    private boolean loading;

    interface AdFinishListener {
        void onFinished();
    }

    void preload(Activity activity) {
        if (loading || interstitialAd != null) return;
        loading = true;
        AdRequest request = new AdRequest.Builder().build();
        InterstitialAd.load(
                activity,
                INTERSTITIAL_UNIT,
                request,
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(InterstitialAd ad) {
                        loading = false;
                        interstitialAd = ad;
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {
                        loading = false;
                        interstitialAd = null;
                        Log.w(TAG, "load failed: " + error.getMessage());
                    }
                });
    }

    void show(Activity activity, AdFinishListener listener) {
        if (interstitialAd == null) {
            listener.onFinished();
            preload(activity);
            return;
        }
        InterstitialAd ad = interstitialAd;
        interstitialAd = null;
        ad.setFullScreenContentCallback(
                new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                        listener.onFinished();
                        preload(activity);
                    }

                    @Override
                    public void onAdFailedToShowFullScreenContent(AdError error) {
                        listener.onFinished();
                        preload(activity);
                    }
                });
        ad.show(activity);
    }
}
