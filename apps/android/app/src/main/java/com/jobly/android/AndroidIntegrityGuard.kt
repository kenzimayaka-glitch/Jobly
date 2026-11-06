package com.jobly.android

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import java.security.MessageDigest
import java.util.Locale

/**
 * Local APK authenticity gate.
 *
 * This detects a package re-signed with a different certificate and refuses
 * release builds that were produced without an explicitly configured signing
 * certificate pin. It is a local defense-in-depth check, not remote device
 * attestation: a rooted/hooked device can still tamper with client-side code.
 */
internal object AndroidIntegrityGuard {
    private const val EXPECTED_PACKAGE_NAME = "com.jobly.android"

    data class Report(
        val allowedToStart: Boolean,
        val debugBuild: Boolean,
        val reasonCode: String,
        val signerSha256: Set<String>
    )

    fun inspect(context: Context): Report {
        if (context.packageName != EXPECTED_PACKAGE_NAME) {
            return Report(false, false, "PACKAGE_NAME_MISMATCH", emptySet())
        }

        val applicationInfo = context.applicationInfo
        val debuggableFlag = applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0

        if (BuildConfig.DEBUG) {
            return if (debuggableFlag) {
                Report(true, true, "DEBUG_BUILD", emptySet())
            } else {
                Report(false, true, "DEBUG_FLAG_MISMATCH", emptySet())
            }
        }

        if (debuggableFlag) {
            return Report(false, false, "RELEASE_MARKED_DEBUGGABLE", emptySet())
        }

        val expectedPins = BuildConfig.JOBLY_RELEASE_CERT_SHA256
            .split(',', ';', ' ', '\n', '\t')
            .map(::normalizeFingerprint)
            .filter { it.isNotEmpty() }
            .toSet()

        if (expectedPins.isEmpty() || expectedPins.any { !it.matches(Regex("^[A-F0-9]{64}$")) }) {
            return Report(false, false, "RELEASE_CERTIFICATE_PIN_NOT_CONFIGURED", emptySet())
        }

        val signatures = try {
            loadCurrentSignatures(context.packageManager, context.packageName)
        } catch (_: Exception) {
            return Report(false, false, "SIGNING_CERTIFICATE_UNAVAILABLE", emptySet())
        }

        if (signatures.isEmpty()) {
            return Report(false, false, "SIGNING_CERTIFICATE_EMPTY", emptySet())
        }

        val actualPins = signatures.map { signature ->
            val digest = MessageDigest.getInstance("SHA-256").digest(signature.toByteArray())
            digest.joinToString("") { byte -> "%02X".format(Locale.ROOT, byte) }
        }.toSet()

        if (actualPins != expectedPins) {
            return Report(false, false, "SIGNING_CERTIFICATE_MISMATCH", actualPins)
        }

        return Report(true, false, "VERIFIED_RELEASE_SIGNATURE", actualPins)
    }

    @Suppress("DEPRECATION")
    private fun loadCurrentSignatures(
        packageManager: PackageManager,
        packageName: String
    ): List<android.content.pm.Signature> {
        val packageInfo: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
        } else {
            packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
        }

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            packageInfo.signingInfo?.apkContentsSigners?.toList().orEmpty()
        } else {
            packageInfo.signatures?.toList().orEmpty()
        }
    }

    private fun normalizeFingerprint(value: String): String =
        value.filter { it.isLetterOrDigit() }.uppercase(Locale.ROOT)
}
