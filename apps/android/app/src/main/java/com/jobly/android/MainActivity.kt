package com.jobly.android

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

/**
 * Jobly Android shell.
 *
 * A single WebView is reused for Jobly, the promoter's application form and the J'IA
 * assistant page. The external website never receives a native JavaScript bridge.
 */
class MainActivity : Activity() {
    private val baseUrl: String by lazy { BuildConfig.JOBLY_BASE_URL.trimEnd('/') }
    private val baseUri: Uri by lazy { Uri.parse(baseUrl) }
    private val allowedJoblyOrigins: Set<String> by lazy { setOf(baseUri.scheme + "://" + baseUri.authority) }

    private lateinit var root: LinearLayout
    private lateinit var toolbar: LinearLayout
    private lateinit var pageTitle: TextView
    private lateinit var webView: WebView
    private lateinit var fallbackBanner: LinearLayout
    private lateinit var fallbackMessage: TextView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null

    private var applicationMode = false
    private var assistantMode = false
    private var currentApplicationUrl = ""
    private var applicationPayload = JSONObject()
    private var pendingFormAnswers: JSONArray? = null
    private var pendingFormOrigin: String? = null
    private var bridgeAvailable = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(247, 250, 255)
        window.navigationBarColor = Color.WHITE

        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
        }
        toolbar = createToolbar()
        fallbackBanner = createFallbackBanner()
        webView = createWebView()

        root.addView(toolbar)
        root.addView(fallbackBanner)
        root.addView(
            webView,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        )
        setContentView(root)

        val restored = savedInstanceState?.let { webView.restoreState(it) }
        applicationMode = savedInstanceState?.getBoolean(STATE_APPLICATION_MODE) ?: false
        assistantMode = savedInstanceState?.getBoolean(STATE_ASSISTANT_MODE) ?: false
        currentApplicationUrl = savedInstanceState?.getString(STATE_APPLICATION_URL).orEmpty()
        applicationPayload = runCatching {
            JSONObject(savedInstanceState?.getString(STATE_APPLICATION_CONTEXT).orEmpty())
        }.getOrDefault(JSONObject())

        updateToolbar()
        if (restored == null) webView.loadUrl(baseUrl)
    }

    private fun createToolbar(): LinearLayout {
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(10), dp(8), dp(10), dp(8))
            setBackgroundColor(Color.rgb(247, 250, 255))
            visibility = View.GONE
        }
        pageTitle = TextView(this).apply {
            text = "Candidature externe"
            textSize = 14f
            setTextColor(Color.rgb(23, 33, 43))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            maxLines = 1
        }
        bar.addView(pageTitle, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        bar.addView(actionButton("J’IA", Color.rgb(255, 214, 10), Color.rgb(23, 33, 43)) {
            openJiaAssistant()
        })
        bar.addView(actionButton("Chrome", Color.rgb(238, 242, 248), Color.rgb(34, 68, 139)) {
            openCurrentPageInChrome()
        }.apply { tag = CHROME_BUTTON_TAG; visibility = View.GONE })
        bar.addView(actionButton("Jobly", Color.rgb(34, 68, 139), Color.WHITE) {
            if (assistantMode) returnToApplicationForm() else returnToJobly()
        })
        return bar
    }

    private fun createFallbackBanner(): LinearLayout {
        val banner = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(8), dp(12), dp(8))
            setBackgroundColor(Color.rgb(255, 248, 225))
            visibility = View.GONE
        }
        fallbackMessage = TextView(this).apply {
            text = "Ce site peut limiter les navigateurs intégrés."
            textSize = 12f
            setTextColor(Color.rgb(94, 72, 0))
        }
        banner.addView(fallbackMessage, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        banner.addView(actionButton("Ouvrir", Color.rgb(255, 214, 10), Color.rgb(23, 33, 43)) {
            openCurrentPageInChrome()
        })
        return banner
    }

    private fun createWebView(): WebView {
        return WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                allowFileAccess = false
                allowContentAccess = false
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) safeBrowsingEnabled = true
            }
            WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                WebViewCompat.addWebMessageListener(
                    this,
                    "joblyAndroid",
                    allowedJoblyOrigins,
                    object : WebViewCompat.WebMessageListener {
                        override fun onPostMessage(
                            view: WebView,
                            message: WebMessageCompat,
                            sourceOrigin: Uri,
                            isMainFrame: Boolean,
                            replyProxy: JavaScriptReplyProxy
                        ) {
                            if (!isMainFrame || !isTrustedJoblyOrigin(sourceOrigin)) return
                            val raw = message.data ?: return
                            if (raw.length > MAX_BRIDGE_MESSAGE_LENGTH) return
                            val command = runCatching { JSONObject(raw) }.getOrNull() ?: return
                            val payload = command.optJSONObject("payload") ?: return
                            when (command.optString("type")) {
                                "OPEN_EXTERNAL_APPLICATION" -> {
                                    val target = safeHttpsUrl(payload.optString("targetUrl"))
                                        ?: safeHttpsUrl(payload.optString("sourceUrl"))
                                    if (target == null) {
                                        runOnUiThread { Toast.makeText(this@MainActivity, "Lien de candidature HTTPS requis.", Toast.LENGTH_LONG).show() }
                                        return
                                    }
                                    val context = JSONObject().apply {
                                        put("jobId", bounded(payload.optString("jobId"), 120))
                                        put("source", bounded(payload.optString("source"), 40))
                                        put("title", bounded(payload.optString("title"), 240))
                                        put("company", bounded(payload.optString("company"), 180))
                                        put("targetUrl", target)
                                        put("sourceUrl", safeHttpsUrl(payload.optString("sourceUrl")) ?: target)
                                        put("description", bounded(payload.optString("description"), 3000))
                                    }
                                    runOnUiThread {
                                        beginExternalApplication(target, context)
                                        replyProxy.postMessage("{\"type\":\"EXTERNAL_APPLICATION_OPENED\"}")
                                    }
                                }
                                "APPLY_EXTERNAL_FORM_ANSWERS" -> {
                                    if (!applicationMode || !assistantMode || !isJiaAssistantUrl(webView.url.orEmpty())) return
                                    val answers = sanitizeFormAnswers(payload.optJSONArray("fields")) ?: return
                                    val scannedOrigin = originOf(currentApplicationUrl) ?: return
                                    runOnUiThread {
                                        pendingFormAnswers = answers
                                        pendingFormOrigin = scannedOrigin
                                        returnToApplicationForm()
                                        replyProxy.postMessage("{\"type\":\"FORM_ANSWERS_ACCEPTED\"}")
                                    }
                                }
                                "PAIR_PAYMENT_SMS_DEVICE" -> {
                                    val deviceId = bounded(payload.optString("deviceId"), 64)
                                    val deviceToken = bounded(payload.optString("deviceToken"), 128)
                                    val senderArray = payload.optJSONArray("senderIds") ?: JSONArray()
                                    val senderIds = (0 until senderArray.length()).map { bounded(senderArray.optString(it), 120) }.filter { it.isNotBlank() }
                                    val saved = runCatching {
                                        PaymentSmsDeviceCredentials.save(this@MainActivity, deviceId, deviceToken, senderIds)
                                    }.isSuccess
                                    runOnUiThread {
                                        if (saved) {
                                            replyProxy.postMessage(JSONObject().put("type", "PAYMENT_SMS_DEVICE_PAIRED").toString())
                                            requestPaymentSmsPermission()
                                        } else {
                                            replyProxy.postMessage(JSONObject().put("type", "PAYMENT_SMS_DEVICE_PAIR_FAILED").toString())
                                            Toast.makeText(this@MainActivity, "Appairage du téléphone marchand impossible.", Toast.LENGTH_LONG).show()
                                        }
                                    }
                                }
                                "REQUEST_PAYMENT_SMS_PERMISSION" -> runOnUiThread {
                                    requestPaymentSmsPermission()
                                    replyProxy.postMessage(JSONObject().put("type", "PAYMENT_SMS_PERMISSION_REQUESTED").toString())
                                }
                                "REVOKE_PAYMENT_SMS_DEVICE" -> {
                                    val deviceId = bounded(payload.optString("deviceId"), 64)
                                    if (deviceId.isNotBlank()) {
                                        PaymentSmsDeviceCredentials.clear(this@MainActivity, deviceId)
                                        androidx.work.WorkManager.getInstance(this@MainActivity)
                                            .cancelAllWorkByTag(PaymentSmsReceiver.deviceTag(deviceId))
                                    }
                                    runOnUiThread {
                                        replyProxy.postMessage(JSONObject().put("type", "PAYMENT_SMS_DEVICE_REVOKED").toString())
                                        Toast.makeText(this@MainActivity, "Compte marchand supprimé de cet APK.", Toast.LENGTH_LONG).show()
                                    }
                                }
                                else -> return
                            }
                        }
                    }
                )
                bridgeAvailable = true
            } else {
                bridgeAvailable = false
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    // Let embedded promoter widgets and CAPTCHA frames load inside their own page.
                    if (!request.isForMainFrame) return false
                    val uri = request.url
                    val scheme = uri.scheme?.lowercase().orEmpty()
                    if (scheme == "https") {
                        if (applicationMode) return false
                        if (isTrustedJoblyOrigin(uri)) return false
                        openExternalIntent(uri)
                        return true
                    }
                    if (scheme in setOf("mailto", "tel", "sms", "whatsapp")) {
                        openExternalIntent(uri)
                        return true
                    }
                    if (scheme == "http") {
                        if (applicationMode) {
                            showFallback("Ce site utilise HTTP non sécurisé. Ouvre-le dans Chrome si nécessaire.")
                            return true
                        }
                        openExternalIntent(uri)
                        return true
                    }
                    return true
                }

                override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    assistantMode = applicationMode && isJiaAssistantUrl(url)
                    updateToolbar()
                    fallbackBanner.visibility = View.GONE
                }

                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
                    if (pendingFormAnswers != null && applicationMode && !isJiaAssistantUrl(url)) {
                        val currentOrigin = originOf(url)
                        if (currentOrigin == null || currentOrigin != pendingFormOrigin ||
                            isTrustedJoblyOrigin(uri) || safeHttpsUrl(url) == null
                        ) {
                            pendingFormAnswers = null
                            pendingFormOrigin = null
                            Toast.makeText(this@MainActivity, "Le domaine du formulaire a changé. Aucune réponse n’a été insérée.", Toast.LENGTH_LONG).show()
                            return
                        }
                        applyPendingFormAnswers()
                    }
                }

                override fun onReceivedHttpError(
                    view: WebView,
                    request: WebResourceRequest,
                    errorResponse: WebResourceResponse
                ) {
                    super.onReceivedHttpError(view, request, errorResponse)
                    if (applicationMode && request.isForMainFrame && errorResponse.statusCode in setOf(401, 403, 405, 406, 429, 500, 502, 503)) {
                        showFallback("Le promoteur semble bloquer l’affichage intégré (${errorResponse.statusCode}).")
                    }
                }

                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    super.onReceivedError(view, request, error)
                    if (applicationMode && request.isForMainFrame) {
                        showFallback("La page externe ne peut pas être chargée dans Jobly.")
                    }
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    if (filePathCallback == null) return false
                    this@MainActivity.fileChooserCallback?.onReceiveValue(null)
                    this@MainActivity.fileChooserCallback = filePathCallback
                    val accept = fileChooserParams?.acceptTypes
                        ?.firstOrNull { it.isNotBlank() && !it.contains(";") }
                        ?.take(80) ?: "*/*"
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = accept
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
                    }
                    return try {
                        startActivityForResult(Intent.createChooser(intent, "Choisir un document"), FILE_CHOOSER_REQUEST)
                        true
                    } catch (_: ActivityNotFoundException) {
                        this@MainActivity.fileChooserCallback = null
                        filePathCallback.onReceiveValue(null)
                        false
                    }
                }
            }

            isVerticalScrollBarEnabled = true
            overScrollMode = View.OVER_SCROLL_NEVER
        }
    }

    private fun requestPaymentSmsPermission() {
        if (checkSelfPermission(Manifest.permission.RECEIVE_SMS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this, "Réception SMS activée sur ce téléphone marchand.", Toast.LENGTH_LONG).show()
            return
        }
        runCatching {
            requestPermissions(arrayOf(Manifest.permission.RECEIVE_SMS), REQUEST_PAYMENT_SMS_PERMISSION)
        }.onFailure {
            Toast.makeText(this, "Android n’a pas autorisé la réception SMS. Vérifie les restrictions de permission de l’installation de Jobly.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQUEST_PAYMENT_SMS_PERMISSION) return
        val granted = grantResults.firstOrNull() == android.content.pm.PackageManager.PERMISSION_GRANTED
        Toast.makeText(this, if (granted) "Réception SMS Mobile Money activée." else "Permission SMS non accordée. Android peut exiger une autorisation spéciale de l’installateur.", Toast.LENGTH_LONG).show()
    }
    private fun beginExternalApplication(url: String, context: JSONObject) {
        if (!bridgeAvailable) {
            Toast.makeText(this, "L’assistance intégrée n’est pas disponible sur cette version de WebView. Ouverture dans Chrome.", Toast.LENGTH_LONG).show()
            openInChrome(url)
            return
        }
        val safeUrl = safeHttpsUrl(url) ?: return
        applicationPayload = context
        currentApplicationUrl = safeUrl
        applicationMode = true
        assistantMode = false
        toolbar.visibility = View.VISIBLE
        updateToolbar()
        webView.loadUrl(safeUrl)
    }

    private fun openJiaAssistant() {
        if (!applicationMode) return
        webView.evaluateJavascript(FORM_METADATA_SCRIPT) { encodedResult ->
            val rawJson = runCatching {
                JSONTokener(encodedResult).nextValue() as? String
            }.getOrNull().orEmpty()
            val snapshot = runCatching { JSONObject(rawJson) }.getOrNull() ?: JSONObject()
            val fields = snapshot.optJSONArray("fields") ?: JSONArray()
            val currentUrl = safeHttpsUrl(webView.url) ?: currentApplicationUrl
            currentApplicationUrl = currentUrl

            val assistantUrl = Uri.parse(baseUrl + "/jia/android-assist").buildUpon()
                .appendQueryParameter("jobId", bounded(applicationPayload.optString("jobId"), 120))
                .appendQueryParameter("source", bounded(applicationPayload.optString("source"), 40))
                .appendQueryParameter("title", bounded(applicationPayload.optString("title"), 240).ifBlank { "Candidature externe" })
                .appendQueryParameter("company", bounded(applicationPayload.optString("company"), 180))
                .appendQueryParameter("targetUrl", currentUrl)
                .appendQueryParameter("sourceUrl", safeHttpsUrl(applicationPayload.optString("sourceUrl")) ?: currentUrl)
                .appendQueryParameter("description", bounded(applicationPayload.optString("description"), 3000))
                .appendQueryParameter("fields", fields.toString())
                .build()
            assistantMode = true
            updateToolbar()
            webView.loadUrl(assistantUrl.toString())
        }
    }

    private fun returnToApplicationForm() {
        if (!assistantMode || !applicationMode) return
        if (webView.canGoBack()) {
            webView.goBack()
        } else if (currentApplicationUrl.isNotBlank()) {
            webView.loadUrl(currentApplicationUrl)
        }
        assistantMode = false
        updateToolbar()
    }

    private fun sanitizeFormAnswers(input: JSONArray?): JSONArray? {
        if (input == null || input.length() == 0) return null
        val safeTypes = setOf("text", "email", "tel", "url", "search", "textarea", "select")
        val sanitized = JSONArray()
        for (index in 0 until minOf(input.length(), MAX_ANSWER_FIELDS)) {
            val item = input.optJSONObject(index) ?: continue
            val fieldIndex = item.optInt("index", -1)
            val label = bounded(item.optString("label"), 80)
            val type = bounded(item.optString("type"), 20).lowercase()
            val answer = bounded(item.optString("answer"), MAX_ANSWER_LENGTH)
            if (fieldIndex !in 0 until MAX_ANSWER_FIELDS || label.isBlank() ||
                type !in safeTypes || answer.isBlank()
            ) continue
            sanitized.put(JSONObject().apply {
                put("index", fieldIndex)
                put("label", label)
                put("type", type)
                put("answer", answer)
            })
        }
        return sanitized.takeIf { it.length() > 0 }
    }

    private fun applyPendingFormAnswers() {
        val answers = pendingFormAnswers ?: return
        pendingFormAnswers = null
        pendingFormOrigin = null
        webView.evaluateJavascript(buildFormFillScript(answers)) { encodedResult ->
            val raw = runCatching {
                JSONTokener(encodedResult).nextValue() as? String
            }.getOrNull().orEmpty()
            val result = runCatching { JSONObject(raw) }.getOrNull() ?: JSONObject()
            val filled = result.optInt("filled", 0)
            val skipped = result.optInt("skipped", 0)
            Toast.makeText(
                this,
                "$filled champ(s) prérempli(s), $skipped laissé(s) inchangé(s). Vérifie le formulaire avant l’envoi.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun buildFormFillScript(answers: JSONArray): String = """
        (() => {
          const entries = ${answers.toString()};
          const visible = (element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 &&
              style.display !== 'none' && style.visibility !== 'hidden' &&
              element.getAttribute('aria-hidden') !== 'true';
          };
          const labelFor = (element) => {
            const associated = element.labels
              ? Array.from(element.labels).map((label) => label.innerText || label.textContent || '').join(' ').trim()
              : '';
            return associated ||
              element.getAttribute('aria-label') ||
              element.getAttribute('placeholder') ||
              element.getAttribute('name') || '';
          };
          const isEligible = (element) => {
            if (!visible(element) || element.disabled || element.readOnly) return false;
            const tag = element.tagName.toLowerCase();
            const type = tag === 'textarea' ? 'textarea' : tag === 'select'
              ? 'select' : (element.getAttribute('type') || 'text').toLowerCase();
            const autocomplete = (element.getAttribute('autocomplete') || '').toLowerCase();
            const identity = [
              element.getAttribute('name') || '',
              element.getAttribute('id') || '',
              element.getAttribute('aria-label') || '',
              element.getAttribute('placeholder') || '',
              autocomplete
            ].join(' ');
            const sensitive = autocomplete === 'one-time-code' ||
              /(otp|one[-_ ]?time|verification[-_ ]?code|security[-_ ]?code|passcode|password|credit[-_ ]?card|card[-_ ]?number|cvv|cvc|iban|bank|account[-_ ]?number|routing[-_ ]?number|captcha|recaptcha|hcaptcha|consent|terms|agree|accept|legal|privacy)/i.test(identity);
            const supported = tag === 'textarea' || tag === 'select' ||
              ['text', 'email', 'tel', 'url', 'search'].includes(type);
            return supported && !sensitive;
          };
          const controls = Array.from(document.querySelectorAll('input, textarea, select'))
            .filter(isEligible).slice(0, 10);
          let filled = 0;
          let skipped = 0;
          for (const entry of entries) {
            const element = controls[Number(entry.index)];
            if (!element || labelFor(element).slice(0, 80) !== entry.label) {
              skipped++;
              continue;
            }
            const tag = element.tagName.toLowerCase();
            const type = tag === 'textarea' ? 'textarea' : tag === 'select'
              ? 'select' : (element.getAttribute('type') || 'text').toLowerCase();
            if (type !== entry.type || String(element.value || '').trim() !== '') {
              skipped++;
              continue;
            }
            const answer = String(entry.answer || '').trim().slice(0, 500);
            if (!answer) {
              skipped++;
              continue;
            }
            if (tag === 'select') {
              const normalized = answer.toLocaleLowerCase().trim();
              const option = Array.from(element.options).find((candidate) =>
                !candidate.disabled &&
                (String(candidate.textContent || '').toLocaleLowerCase().trim() === normalized ||
                 String(candidate.value || '').toLocaleLowerCase().trim() === normalized)
              );
              if (!option) {
                skipped++;
                continue;
              }
              const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
              if (!setter) {
                skipped++;
                continue;
              }
              setter.call(element, option.value);
            } else {
              if (typeof element.maxLength === 'number' && element.maxLength >= 0 && answer.length > element.maxLength) {
                skipped++;
                continue;
              }
              const prototype = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
              const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
              if (!setter) {
                skipped++;
                continue;
              }
              setter.call(element, answer);
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            if (String(element.value || '').trim() === answer ||
                (tag === 'select' && String(element.selectedOptions?.[0]?.textContent || '').trim() === answer)) {
              filled++;
            } else {
              skipped++;
            }
          }
          return JSON.stringify({ filled, skipped });
        })()
    """.trimIndent()

    private fun returnToJobly() {
        applicationMode = false
        assistantMode = false
        currentApplicationUrl = ""
        applicationPayload = JSONObject()
        pendingFormAnswers = null
        pendingFormOrigin = null
        fallbackBanner.visibility = View.GONE
        toolbar.findViewWithTag<Button>(CHROME_BUTTON_TAG)?.visibility = View.GONE
        webView.clearHistory()
        updateToolbar()
        webView.loadUrl(baseUrl)
    }

    private fun openCurrentPageInChrome() {
        val url = safeHttpsUrl(webView.url) ?: currentApplicationUrl
        if (url.isBlank()) return
        openInChrome(url)
    }

    private fun openInChrome(url: String) {
        val uri = Uri.parse(url)
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("com.android.chrome"))
        } catch (_: ActivityNotFoundException) {
            try {
                startActivity(Intent(Intent.ACTION_VIEW, uri))
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(this, "Aucun navigateur disponible pour ouvrir ce lien.", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun openExternalIntent(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, "Aucune application disponible pour ouvrir ce lien.", Toast.LENGTH_LONG).show()
        }
    }

    private fun showFallback(message: String) {
        runOnUiThread {
            fallbackMessage.text = message
            fallbackBanner.visibility = View.VISIBLE
            toolbar.findViewWithTag<Button>(CHROME_BUTTON_TAG)?.visibility = View.VISIBLE
        }
    }

    private fun updateToolbar() {
        toolbar.visibility = if (applicationMode) View.VISIBLE else View.GONE
        pageTitle.text = if (assistantMode) "Assistance J’IA" else "Candidature externe"
        val assistantButton = toolbar.getChildAt(1) as? Button
        val returnButton = toolbar.getChildAt(3) as? Button
        assistantButton?.visibility = if (assistantMode) View.GONE else View.VISIBLE
        returnButton?.text = if (assistantMode) "Formulaire" else "Jobly"
    }

    private fun isTrustedJoblyOrigin(uri: Uri): Boolean {
        val origin = uri.scheme + "://" + uri.authority
        return origin in allowedJoblyOrigins
    }

    private fun isJiaAssistantUrl(url: String): Boolean {
        val uri = Uri.parse(url)
        return isTrustedJoblyOrigin(uri) && uri.path?.startsWith("/jia/android-assist") == true
    }

    private fun originOf(value: String?): String? {
        val uri = runCatching { Uri.parse(value?.trim().orEmpty()) }.getOrNull() ?: return null
        if (uri.scheme != "https" || uri.host.isNullOrBlank() || uri.userInfo != null) return null
        return uri.scheme + "://" + uri.authority
    }

    private fun safeHttpsUrl(value: String?): String? {
        val uri = runCatching { Uri.parse(value?.trim().orEmpty()) }.getOrNull() ?: return null
        val host = uri.host?.lowercase().orEmpty()
        if (uri.scheme != "https" || host.isBlank() || uri.userInfo != null) return null
        if (host == "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null
        if (host.matches(Regex("^\\d{1,3}(?:\\.\\d{1,3}){3}$")) || host.contains(":")) return null
        if (host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || host.startsWith("172.16.") || host.startsWith("172.17.") || host.startsWith("172.18.") || host.startsWith("172.19.") || host.startsWith("172.2") || host.startsWith("172.30.") || host.startsWith("172.31.") || host.startsWith("0.")) return null
        return uri.toString().takeIf { it.length <= 2048 }
    }

    private fun bounded(value: String?, max: Int): String =
        value.orEmpty().replace(Regex("[\\u0000-\\u001F]"), " ").trim().take(max)

    private fun actionButton(label: String, background: Int, foreground: Int, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 11f
            setTextColor(foreground)
            backgroundTintList = ColorStateList.valueOf(background)
            minHeight = dp(40)
            minimumHeight = dp(40)
            minWidth = dp(0)
            minimumWidth = dp(0)
            setPadding(dp(8), 0, dp(8), 0)
            setOnClickListener { onClick() }
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
        outState.putBoolean(STATE_APPLICATION_MODE, applicationMode)
        outState.putBoolean(STATE_ASSISTANT_MODE, assistantMode)
        outState.putString(STATE_APPLICATION_URL, currentApplicationUrl)
        outState.putString(STATE_APPLICATION_CONTEXT, applicationPayload.toString())
    }

    @Deprecated("Deprecated in Android 13; file picker callback remains supported.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != FILE_CHOOSER_REQUEST) return
        val callback = fileChooserCallback
        fileChooserCallback = null
        if (callback == null) return
        val results = when {
            resultCode != RESULT_OK -> null
            data?.clipData != null -> Array(data.clipData!!.itemCount) { index -> data.clipData!!.getItemAt(index).uri }
            data?.data != null -> arrayOf(data.data!!)
            else -> null
        }
        callback.onReceiveValue(results)
    }

    @Deprecated("Use the system back dispatcher on new Android integrations.")
    override fun onBackPressed() {
        when {
            assistantMode -> returnToApplicationForm()
            applicationMode -> returnToJobly()
            webView.canGoBack() -> webView.goBack()
            else -> super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (this::webView.isInitialized) {
            fileChooserCallback?.onReceiveValue(null)
            webView.stopLoading()
            webView.webChromeClient = null
            webView.webViewClient = WebViewClient()
            webView.removeAllViews()
            webView.destroy()
        }
        super.onDestroy()
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST = 4201
        private const val REQUEST_PAYMENT_SMS_PERMISSION = 4202
        private const val MAX_BRIDGE_MESSAGE_LENGTH = 12_000
        private const val MAX_ANSWER_FIELDS = 10
        private const val MAX_ANSWER_LENGTH = 500
        private const val STATE_APPLICATION_MODE = "jobly.application.mode"
        private const val STATE_ASSISTANT_MODE = "jobly.assistant.mode"
        private const val STATE_APPLICATION_URL = "jobly.application.url"
        private const val STATE_APPLICATION_CONTEXT = "jobly.application.context"
        private const val CHROME_BUTTON_TAG = "jobly.chrome.button"

        /**
         * Reads only visible labels, field types, required flags and select options.
         * No field value, password, uploaded file, hidden input or OTP value is read.
         */
        private val FORM_METADATA_SCRIPT = """
            (() => {
              const visible = (element) => {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                return rect.width > 0 && rect.height > 0 &&
                  style.display !== 'none' && style.visibility !== 'hidden' &&
                  element.getAttribute('aria-hidden') !== 'true';
              };
              const labelFor = (element) => {
                const associated = element.labels
                  ? Array.from(element.labels).map((label) => label.innerText || label.textContent || '').join(' ').trim()
                  : '';
                return associated ||
                  element.getAttribute('aria-label') ||
                  element.getAttribute('placeholder') ||
                  element.getAttribute('name') || '';
              };
              const fields = Array.from(document.querySelectorAll('input, textarea, select'))
                .filter((element) => {
                  if (!visible(element)) return false;
                  const tag = element.tagName.toLowerCase();
                  const type = tag === 'textarea' ? 'textarea' : tag === 'select'
                    ? 'select' : (element.getAttribute('type') || 'text').toLowerCase();
                  const autocomplete = (element.getAttribute('autocomplete') || '').toLowerCase();
                  const identity = [
                    element.getAttribute('name') || '',
                    element.getAttribute('id') || '',
                    element.getAttribute('aria-label') || '',
                    element.getAttribute('placeholder') || '',
                    autocomplete
                  ].join(' ');
                  const sensitiveField = autocomplete === 'one-time-code' ||
                    /(otp|one[-_ ]?time|verification[-_ ]?code|security[-_ ]?code|passcode|password|credit[-_ ]?card|card[-_ ]?number|cvv|cvc|iban|bank|account[-_ ]?number|routing[-_ ]?number|captcha|recaptcha|hcaptcha|consent|terms|agree|accept|legal|privacy)/i.test(identity);
                  const supported = tag === 'textarea' || tag === 'select' ||
                    ['text', 'email', 'tel', 'url', 'search'].includes(type);
                  return supported && !sensitiveField;
                })
                .slice(0, 10)
                .map((element, index) => {
                  const tag = element.tagName.toLowerCase();
                  const type = tag === 'textarea' ? 'textarea' : tag === 'select'
                    ? 'select' : (element.getAttribute('type') || 'text').toLowerCase();
                  const options = tag === 'select'
                    ? Array.from(element.options).map((option) => (option.textContent || '').trim()).filter(Boolean).slice(0, 4)
                    : [];
                  return {
                    index,
                    label: String(labelFor(element)).slice(0, 80),
                    type: String(type).slice(0, 40),
                    required: element.required === true,
                    options
                  };
                })
                .filter((field) => field.label);
              return JSON.stringify({
                url: location.href,
                title: document.title,
                fields
              });
            })()
        """.trimIndent()
    }
}
