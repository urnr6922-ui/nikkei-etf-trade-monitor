package jp.jarvis.assistant

import android.app.Activity
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
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
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                view.evaluateJavascript("""
                    (function(){
                      if(!window.AndroidTTS || !window.speechSynthesis) return;
                      const s=window.speechSynthesis;
                      s.speak=function(u){
                        try{if(u&&u.onstart)u.onstart();}catch(e){}
                        try{window.AndroidTTS.speak((u&&u.text)||'');}catch(e){}
                        const ms=Math.max(900,(((u&&u.text)||'').length)*170);
                        setTimeout(function(){try{if(u&&u.onend)u.onend();}catch(e){}},ms);
                      };
                      s.cancel=function(){try{window.AndroidTTS.stop();}catch(e){}};
                      s.resume=function(){};
                    })();
                """.trimIndent(), null)
            }
        }
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
                if (!ready) return@runOnUiThread
                tts.language = Locale.JAPAN
                tts.setSpeechRate(0.95f)
                tts.setPitch(1.0f)
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "JARVIS")
            }
        }
        @JavascriptInterface
        fun stop() { runOnUiThread { if (ready) tts.stop() } }
    }

    override fun onDestroy() {
        if (::tts.isInitialized) { tts.stop(); tts.shutdown() }
        if (::web.isInitialized) web.destroy()
        super.onDestroy()
    }
}
