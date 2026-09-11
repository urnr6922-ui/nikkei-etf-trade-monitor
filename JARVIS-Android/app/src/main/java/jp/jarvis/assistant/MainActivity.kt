package jp.jarvis.assistant

import android.app.Activity
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.Locale

class MainActivity : Activity(), TextToSpeech.OnInitListener {
    private lateinit var web: WebView
    private lateinit var tts: TextToSpeech
    private var ready = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this, this)
        web = WebView(this)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.webViewClient = WebViewClient()
        web.webChromeClient = WebChromeClient()
        web.addJavascriptInterface(AndroidTtsBridge(), "AndroidTTS")
        setContentView(web)
        web.loadUrl("https://urnr6922-ui.github.io/nikkei-etf-trade-monitor/jarvis/")
    }

    override fun onInit(status: Int) {
        ready = status == TextToSpeech.SUCCESS
        if (ready) tts.language = Locale.JAPAN
    }

    private inner class AndroidTtsBridge {
        @JavascriptInterface
        fun speak(text: String) {
            runOnUiThread {
                if (!ready) {
                    tts = TextToSpeech(this@MainActivity, this@MainActivity)
                    return@runOnUiThread
                }
                tts.language = Locale.JAPAN
                tts.setSpeechRate(0.95f)
                tts.setPitch(1.0f)
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "JARVIS")
            }
        }

        @JavascriptInterface
        fun stop() {
            runOnUiThread { if (ready) tts.stop() }
        }
    }

    override fun onDestroy() {
        if (::tts.isInitialized) { tts.stop(); tts.shutdown() }
        if (::web.isInitialized) web.destroy()
        super.onDestroy()
    }
}
