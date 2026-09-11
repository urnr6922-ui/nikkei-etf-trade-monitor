package jp.jarvis.assistant

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.ArrayDeque
import java.util.Locale

class MainActivity : Activity(), TextToSpeech.OnInitListener {
    companion object { private const val REQ_AUDIO = 1001 }

    private lateinit var web: WebView
    private lateinit var tts: TextToSpeech
    private var ready = false
    private var greeted = false
    private val pendingSpeech = ArrayDeque<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        tts = TextToSpeech(this, this)
        web = WebView(this)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.webViewClient = WebViewClient()
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                        } else {
                            request.deny()
                            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_AUDIO)
                        }
                    } else {
                        request.deny()
                    }
                }
            }
        }
        web.addJavascriptInterface(AndroidTtsBridge(), "AndroidTTS")
        setContentView(web)
        web.loadUrl("https://urnr6922-ui.github.io/nikkei-etf-trade-monitor/jarvis/")

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_AUDIO)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_AUDIO && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            web.reload()
        }
    }

    override fun onInit(status: Int) {
        ready = status == TextToSpeech.SUCCESS
        if (!ready) return

        var result = tts.setLanguage(Locale.JAPAN)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            result = tts.setLanguage(Locale.JAPANESE)
        }
        tts.setSpeechRate(0.95f)
        tts.setPitch(1.0f)

        while (pendingSpeech.isNotEmpty()) {
            speakNow(pendingSpeech.removeFirst())
        }

        // First-launch hardware test: confirms that Android TTS is actually audible.
        if (!greeted) {
            greeted = true
            speakNow("こんにちは。JARVISです。")
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
