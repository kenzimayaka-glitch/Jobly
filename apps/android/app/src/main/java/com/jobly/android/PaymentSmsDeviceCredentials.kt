package com.jobly.android

import android.content.Context
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import org.json.JSONArray
import javax.crypto.spec.GCMParameterSpec
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties

/**
 * Keeps the paired merchant device token and queued SMS payloads encrypted at rest.
 * The AES key is hardware-backed by Android Keystore where the device supports it.
 */
object PaymentSmsDeviceCredentials {
    private const val PREFS = "jobly_payment_sms_secure"
    private const val DEVICE_ID = "device_id"
    private const val TOKEN_CIPHERTEXT = "device_token_ciphertext"
    private const val SENDER_IDS_CIPHERTEXT = "sender_ids_ciphertext"
    private const val KEY_ALIAS = "jobly_payment_sms_aes_v1"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val IV_BYTES = 12
    private const val TAG_BITS = 128

    data class Credentials(val deviceId: String, val token: String, val senderIds: Set<String>)

    fun save(context: Context, deviceId: String, token: String, senderIds: List<String>) {
        require(deviceId.length in 20..64) { "INVALID_DEVICE_ID" }
        require(token.length in 32..128) { "INVALID_DEVICE_TOKEN" }
        val encrypted = encrypt(context, token)
        val allowlist = senderIds.map(::normalizeSender).filter { it.isNotBlank() }.distinct()
        require(allowlist.isNotEmpty()) { "SMS_SENDER_ALLOWLIST_REQUIRED" }
        val encryptedSenders = encrypt(context, JSONArray(allowlist).toString())
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(DEVICE_ID, deviceId)
            .putString(TOKEN_CIPHERTEXT, encrypted)
            .putString(SENDER_IDS_CIPHERTEXT, encryptedSenders)
            .apply()
    }

    fun read(context: Context): Credentials? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val id = prefs.getString(DEVICE_ID, null) ?: return null
        val encrypted = prefs.getString(TOKEN_CIPHERTEXT, null) ?: return null
        val encryptedSenders = prefs.getString(SENDER_IDS_CIPHERTEXT, null) ?: return null
        val token = runCatching { decrypt(context, encrypted) }.getOrNull() ?: return null
        val senderIds = runCatching {
            val array = JSONArray(decrypt(context, encryptedSenders))
            (0 until array.length()).map { normalizeSender(array.optString(it)) }.filter { it.isNotBlank() }.toSet()
        }.getOrNull() ?: return null
        if (id.isBlank() || token.length < 32 || senderIds.isEmpty()) return null
        return Credentials(id, token, senderIds)
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }

    fun encrypt(context: Context, value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val ciphertext = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        val packed = cipher.iv + ciphertext
        return Base64.encodeToString(packed, Base64.NO_WRAP)
    }

    fun decrypt(context: Context, encoded: String): String {
        val packed = Base64.decode(encoded, Base64.NO_WRAP)
        require(packed.size > IV_BYTES) { "INVALID_ENCRYPTED_SMS" }
        val iv = packed.copyOfRange(0, IV_BYTES)
        val ciphertext = packed.copyOfRange(IV_BYTES, packed.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(TAG_BITS, iv))
        return String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8)
    }

    fun isAllowedSender(context: Context, senderId: String): Boolean {
        val normalized = normalizeSender(senderId)
        if (normalized.isBlank()) return false
        return read(context)?.senderIds?.contains(normalized) == true
    }

    private fun normalizeSender(value: String): String =
        value.trim().replace(Regex("\\\\s+"), " ").uppercase(java.util.Locale.ROOT)
    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )
        return generator.generateKey()
    }
}
