package com.jobly.android

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Uploads only SMS received by the paired Jobly merchant SIM. The queued body is
 * AES-GCM encrypted in WorkManager's persisted input data and decrypted only here.
 */
class PaymentSmsUploadWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        val credentials = PaymentSmsDeviceCredentials.read(applicationContext) ?: return Result.failure()
        val queuedDeviceId = inputData.getString(KEY_DEVICE_ID).orEmpty()
        val senderId = inputData.getString(KEY_SENDER_ID)?.trim().orEmpty()
        val encryptedBody = inputData.getString(KEY_ENCRYPTED_SMS_BODY).orEmpty()
        if (queuedDeviceId != credentials.deviceId || senderId.isBlank() || encryptedBody.isBlank()) return Result.failure()
        val normalizedSender = senderId.trim().replace(Regex("\\\\s+"), " ").uppercase(java.util.Locale.ROOT)
        if (!credentials.senderIds.contains(normalizedSender)) return Result.failure()

        val smsBody = runCatching {
            PaymentSmsDeviceCredentials.decrypt(applicationContext, encryptedBody)
        }.getOrNull() ?: return Result.failure()
        if (smsBody.isBlank() || smsBody.length > MAX_SMS_LENGTH) return Result.failure()

        var connection: HttpURLConnection? = null
        return try {
            val endpoint = URL(BuildConfig.JOBLY_BASE_URL.trimEnd('/') + "/api/payments/sms/ingest")
            connection = (endpoint.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("x-jobly-sms-device", credentials.deviceId)
                setRequestProperty("Authorization", "Bearer " + credentials.token)
            }
            val payload = JSONObject()
                .put("senderId", senderId)
                .put("smsBody", smsBody)
                .toString()
                .toByteArray(StandardCharsets.UTF_8)
            connection.outputStream.use { stream -> stream.write(payload) }
            val responseCode = connection.responseCode
            when {
                responseCode in 200..299 -> Result.success()
                responseCode == 408 || responseCode == 425 || responseCode == 429 || responseCode >= 500 -> Result.retry()
                else -> Result.failure()
            }
        } catch (_: IOException) {
            Result.retry()
        } catch (_: Exception) {
            Result.failure()
        } finally {
            connection?.disconnect()
        }
    }

    companion object {
        const val KEY_DEVICE_ID = "device_id"
        const val KEY_SENDER_ID = "sender_id"
        const val KEY_ENCRYPTED_SMS_BODY = "encrypted_sms_body"
        private const val MAX_SMS_LENGTH = 5000
        private const val CONNECT_TIMEOUT_MS = 8000
        private const val READ_TIMEOUT_MS = 8000
    }
}
