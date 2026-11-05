package com.jobly.android

import android.net.Uri
import android.view.View
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.LinearLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivitySmokeTest {
    @Test
    fun launchesJoblyInARestrictedHttpsWebView() {
        val scenario = ActivityScenario.launch(MainActivity::class.java)
        try {
            scenario.onActivity { activity ->
                val content = activity.findViewById<ViewGroup>(android.R.id.content)
                val root = content.getChildAt(0) as LinearLayout
                assertEquals("Expected toolbar, fallback banner and one WebView", 3, root.childCount)
                assertEquals("External toolbar must be hidden on first launch", View.GONE, root.getChildAt(0).visibility)

                val webView = root.getChildAt(2) as WebView
                val initialUri = Uri.parse(webView.url.orEmpty())
                val configuredUri = Uri.parse(BuildConfig.JOBLY_BASE_URL)

                assertEquals("https", initialUri.scheme)
                assertEquals(configuredUri.host, initialUri.host)
                assertTrue(webView.settings.javaScriptEnabled)
                assertEquals(WebSettings.MIXED_CONTENT_NEVER_ALLOW, webView.settings.mixedContentMode)
                assertFalse(webView.settings.allowFileAccess)
                assertFalse(webView.settings.allowContentAccess)
            }
        } finally {
            scenario.close()
        }
    }
}
