package com.jobly.android

import android.content.Context
import android.util.Base64
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Stores one or more merchant provider registrations encrypted at rest.
 * The AES key is held by Android Keystore; the token and sender allowlists are
 * never stored as plaintext in SharedPreferences or WorkManager input data.
 */
object PaymentSmsDeviceCredentials {
    private const val PREFS = "jobly_payment_sms_secure"
    private const val RECORDS_CIPHERTEXT = "merchant_device_records_ciphertext"
    private const val KEY_ALIAS = "jobly_payment_sms_aes_v1"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val IV_BYTES = 12
    private const val TAG_BITS = 128

    data class Credentials(val deviceId: String, val token: String, val senderIds: Set<String>)

    fun save(context: Context, deviceId: String, token: String, senderIds: List<String>) {
        require(deviceId.length in 20..64) { "INVALID_DEVICE_ID" }
        require(token.length in 32..128) { "INVALID_DEVICE_TOKEN" }
        val allowlist = senderIds.map(::normalizeSender).filter { it.isNotBlank() }.distinct()
        require(allowlist.isNotEmpty()) { "SMS_SENDER_ALLOWLIST_REQUIRED" }

        val records = readAll(context).filterNot { it.deviceId == deviceId }.toMutableList()
        records.add(Credentials(deviceId, token, allowlist.toSet()))
        writeAll(context, records)
    }

    fun read(context: Context, deviceId: String): Credentials? =
        readAll(context).firstOrNull { it.deviceId == deviceId }

    fun findUniqueForSender(context: Context, senderId: String): Credentials? {
        val normalized = normalizeSender(senderId)
        if (normalized.isBlank()) return null
        val matches = readAll(context).filter { normalized in it.senderIds }
        // If two provider profiles use the same sender ID, do not guess which
        // merchant account should receive the transaction.
        return matches.singleOrNull()
    }

    fun readAll(context: Context): List<Credentials> {
        val encrypted = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(RECORDS_CIPHERTEXT, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(decrypt(context, encrypted))
            (0 until array.length()).mapNotNull { index ->
                val item = array.optJSONObject(index) ?: return@mapNotNull null
                val deviceId = item.optString("deviceId").trim()
                val token = item.optString("token")
                val senders = item.optJSONArray("senderIds") ?: JSONArray()
                val senderIds = (0 until senders.length())
                    .map { normalizeSender(senders.optString(it)) }
                    .filter { it.isNotBlank() }
                    .toSet()
                if (deviceId.length !in 20..64 || token.length !in 32..128 || senderIds.isEmpty()) {
                    null
                } else {
                    Credentials(deviceId, token, senderIds)
                }
            }
        }.getOrDefault(emptyList())
    }

    fun clear(context: Context, deviceId: String? = null) {
        if (deviceId.isNullOrBlank()) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
            return
        }
        writeAll(context, readAll(context).filterNot { it.deviceId == deviceId })
    }

    fun encrypt(context: Context, value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val ciphertext = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        return Base64.encodeToString(cipher.iv + ciphertext, Base64.NO_WRAP)
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

    private fun writeAll(context: Context, records: List<Credentials>) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        if (records.isEmpty()) {
            prefs.remove(RECORDS_CIPHERTEXT).apply()
            return
        }
        val array = JSONArray()
        records.forEach { record ->
            array.put(JSONObject()
                .put("deviceId", record.deviceId)
                .put("token", record.token)
                .put("senderIds", JSONArray(record.senderIds.toList())))
        }
        prefs.putString(RECORDS_CIPHERTEXT, encrypt(context, array.toString())).apply()
    }

    private fun normalizeSender(value: String): String =
        value.trim().replace(Regex("\\s+"), " ").uppercase(java.util.Locale.ROOT)

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
