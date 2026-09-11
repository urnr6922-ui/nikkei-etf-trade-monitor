package jp.jarvis.assistant;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayDeque;
import java.util.Locale;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {
    private static final int REQ_AUDIO = 1001;
    private WebView web;
    private TextToSpeech tts;
    private boolean ready = false;
    private boolean greeted = false;
    private final ArrayDeque<String> pendingSpeech = new ArrayDeque<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, this);
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (request.getResources() != null) {
                        for (String resource : request.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                                } else {
                                    request.deny();
                                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_AUDIO);
                                }
                                return;
                            }
                        }
                    }
                    request.deny();
                });
            }
        });
        web.addJavascriptInterface(new AndroidTtsBridge(), "AndroidTTS");
        setContentView(web);
        web.loadUrl("https://urnr6922-ui.github.io/nikkei-etf-trade-monitor/jarvis/");

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_AUDIO);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_AUDIO && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            web.reload();
        }
    }

    @Override
    public void onInit(int status) {
        ready = status == TextToSpeech.SUCCESS;
        if (!ready) return;

        int result = tts.setLanguage(Locale.JAPAN);
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            tts.setLanguage(Locale.JAPANESE);
        }
        tts.setSpeechRate(0.95f);
        tts.setPitch(1.0f);

        while (!pendingSpeech.isEmpty()) {
            speakNow(pendingSpeech.removeFirst());
        }

        if (!greeted) {
            greeted = true;
            speakNow("こんにちは。JARVISです。");
        }
    }

    private void speakNow(String text) {
        if (text == null || text.trim().isEmpty() || !ready) return;
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "JARVIS");
    }

    private final class AndroidTtsBridge {
        @JavascriptInterface
        public void speak(String text) {
            runOnUiThread(() -> {
                if (text == null || text.trim().isEmpty()) return;
                if (!ready) {
                    pendingSpeech.addLast(text);
                    return;
                }
                speakNow(text);
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> {
                pendingSpeech.clear();
                if (ready) tts.stop();
            });
        }
    }

    @Override
    protected void onDestroy() {
        pendingSpeech.clear();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
