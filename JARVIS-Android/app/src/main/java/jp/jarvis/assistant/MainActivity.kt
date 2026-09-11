package jp.jarvis.assistant

import android.app.Activity
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.ArrayDeque
import java.util.Locale

class MainActivity : Activity(), TextToSpeech.OnInitListener {
    private lateinit var web: WebView
    private lateinit var tts: TextToSpeech
    private var ready = false
    private val pendingSpeech = ArrayDeque<String>()

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
        if (!ready) return
        val result = tts.setLanguage(Locale.JAPAN)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            tts.setLanguage(Locale.JAPANESE)
        }
        tts.setSpeechRate(0.95f)
        tts.setPitch(1.0f)
        while (pendingSpeech.isNotEmpty()) {
            speakNow(pendingSpeech.removeFirst())
        }
    }

    private fun speakNow(text: String) {
        if (text.isBlank() || !ready) return
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "JARVIS")
    }

    private inner class AndroidTtsBridge {
        @JavascriptInterface
        fun speak(text: String) {
            runOnUiThread {
                if (text.isBlank()) return@runOnUiThread
                if (!ready) {
                    pendingSpeech.addLast(text)
                    return@runOnUiThread
                }
                speakNow(text)
            }
        }

        @JavascriptInterface
        fun stop() {
            runOnUiThread {
                pendingSpeech.clear()
                if (ready) tts.stop()
            }
        }
    }

    override fun onDestroy() {
        pendingSpeech.clear()
        if (::tts.isInitialized) { tts.stop(); tts.shutdown() }
        if (::web.isInitialized) web.destroy()
        super.onDestroy()
    }
}
