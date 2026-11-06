package com.jobly.android

import android.content.Context
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
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
    private const val KEY_ALIAS = "jobly_payment_sms_aes_v1"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val IV_BYTES = 12
    private const val TAG_BITS = 128

    data class Credentials(val deviceId: String, val token: String)

    fun save(context: Context, deviceId: String, token: String) {
        require(deviceId.length in 20..64) { "INVALID_DEVICE_ID" }
        require(token.length in 32..128) { "INVALID_DEVICE_TOKEN" }
        val encrypted = encrypt(context, token)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(DEVICE_ID, deviceId)
            .putString(TOKEN_CIPHERTEXT, encrypted)
            .apply()
    }

    fun read(context: Context): Credentials? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val id = prefs.getString(DEVICE_ID, null) ?: return null
        val encrypted = prefs.getString(TOKEN_CIPHERTEXT, null) ?: return null
        val token = runCatching { decrypt(context, encrypted) }.getOrNull() ?: return null
        if (id.isBlank() || token.length < 32) return null
        return Credentials(id, token)
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
