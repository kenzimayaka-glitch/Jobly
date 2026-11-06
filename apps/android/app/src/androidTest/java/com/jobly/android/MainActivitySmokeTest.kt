package com.jobly.android

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.view.View
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.LinearLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivitySmokeTest {
    @Test
    fun debugBuildPassesOnlyAsDevelopmentAndReportsItsStatus() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val report = AndroidIntegrityGuard.inspect(context)

        assertEquals("com.jobly.android", context.packageName)
        assertTrue("The CI debug APK must remain testable", report.allowedToStart)
        assertTrue("A debug APK must never be reported as a verified release", report.debugBuild)
        assertEquals("DEBUG_BUILD", report.reasonCode)
    }

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


    @Test
    fun packageDeclaresSmsReceivePermissionAndRegisteredReceiver() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        @Suppress("DEPRECATION")
        val packageInfo = context.packageManager.getPackageInfo(
            context.packageName,
            PackageManager.GET_PERMISSIONS or PackageManager.GET_RECEIVERS
        )
        val requested = packageInfo.requestedPermissions.orEmpty().toSet()
        assertTrue(
            "RECEIVE_SMS must be declared for the merchant handset receiver",
            Manifest.permission.RECEIVE_SMS in requested
        )
        assertTrue(
            "The SMS receiver must be registered in the existing Jobly package",
            packageInfo.receivers.orEmpty().any { it.name == PaymentSmsReceiver::class.java.name }
        )
    }

    @Test
    fun merchantCredentialsAndSenderAllowlistAreEncryptedAtRest() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        PaymentSmsDeviceCredentials.clear(context)
        val deviceId = UUID.randomUUID().toString()
        val token = "JOBLY_SMS_DEVICE_TOKEN_TEST_ONLY_0123456789"
        val senderId = "MTN_MOMO_TEST_SENDER"

        try {
            PaymentSmsDeviceCredentials.save(context, deviceId, token, listOf(senderId))
            val encrypted = context.getSharedPreferences(
                "jobly_payment_sms_secure",
                Context.MODE_PRIVATE
            ).getString("merchant_device_records_ciphertext", null)

            assertTrue("Encrypted merchant credentials must be persisted", !encrypted.isNullOrBlank())
            assertFalse("Raw device token must not be stored in plaintext", encrypted!!.contains(token))
            assertFalse("Sender allowlist must not be stored in plaintext", encrypted.contains(senderId))
            assertEquals(token, PaymentSmsDeviceCredentials.read(context, deviceId)?.token)
            assertTrue(senderId in PaymentSmsDeviceCredentials.read(context, deviceId)!!.senderIds)
            assertEquals(deviceId, PaymentSmsDeviceCredentials.findUniqueForSender(context, senderId)?.deviceId)
        } finally {
            PaymentSmsDeviceCredentials.clear(context, deviceId)
        }
        assertEquals(null, PaymentSmsDeviceCredentials.read(context, deviceId))
    }

}
