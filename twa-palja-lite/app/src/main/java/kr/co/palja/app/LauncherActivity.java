/*
 * Play Lite — WebView + AdMob 전면 (TWA Chrome에서는 JS 브릿지 불가)
 */
package kr.co.palja.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

public class LauncherActivity extends AppCompatActivity {
    private static final String HOST = "8code.kr";
    private static final String LAUNCH_PATH = "/lifecode-play/?source=play";

    private WebView webView;
    private final PlayAdManager adManager = new PlayAdManager();
    private boolean adShowing;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        }

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new PlayAdBridge(), "PaljaPlayAds");
        webView.setWebViewClient(
                new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        if (uri == null) return false;
                        String host = uri.getHost();
                        if (host == null || HOST.equals(host) || host.endsWith("." + HOST)) {
                            return false;
                        }
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                        return true;
                    }
                });

        setContentView(webView);
        adManager.preload(this);

        String url = getLaunchUrl();
        webView.loadUrl(url);
    }

    private String getLaunchUrl() {
        Intent intent = getIntent();
        Uri data = intent != null ? intent.getData() : null;
        if (data != null && HOST.equals(data.getHost())) {
            return data.toString();
        }
        return "https://" + HOST + LAUNCH_PATH;
    }

    private void notifyAdFinished() {
        adShowing = false;
        if (webView == null) return;
        webView.post(
                () ->
                        webView.evaluateJavascript(
                                "(function(){if(window.__paljaOnPlayAdDone){window.__paljaOnPlayAdDone();}})();",
                                null));
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private final class PlayAdBridge {
        @JavascriptInterface
        public void requestInterstitial() {
            runOnUiThread(
                    () -> {
                        if (adShowing) return;
                        adShowing = true;
                        adManager.show(
                                LauncherActivity.this,
                                () -> notifyAdFinished());
                    });
        }
    }
}
