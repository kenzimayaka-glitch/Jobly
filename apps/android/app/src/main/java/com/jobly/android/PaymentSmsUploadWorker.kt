package com.jobly.android

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Decrypts a private queued SMS file and posts only to the configured HTTPS Jobly
 * endpoint. WorkManager Data holds a short path, never the SMS contents.
 */
class PaymentSmsUploadWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        val queuedDeviceId = inputData.getString(KEY_DEVICE_ID).orEmpty()
        val senderId = inputData.getString(KEY_SENDER_ID)?.trim().orEmpty()
        val encryptedFilePath = inputData.getString(KEY_ENCRYPTED_SMS_FILE).orEmpty()
        if (queuedDeviceId.isBlank() || senderId.isBlank() || encryptedFilePath.isBlank()) return Result.failure()

        val queuedFile = File(encryptedFilePath)
        val queueDir = PaymentSmsReceiver.queueDirectory(applicationContext).canonicalFile
        val safePath = runCatching { queuedFile.canonicalFile }.getOrNull()
        if (safePath == null || safePath.parentFile != queueDir ||
            !safePath.name.startsWith(queuedDeviceId + "__") || !safePath.name.endsWith(".enc")) {
            return Result.failure()
        }

        val credentials = PaymentSmsDeviceCredentials.read(applicationContext, queuedDeviceId)
        if (credentials == null) {
            safePath.delete()
            return Result.failure()
        }

        val normalizedSender = senderId.trim().replace(Regex("\\s+"), " ").uppercase(java.util.Locale.ROOT)
        if (!credentials.senderIds.contains(normalizedSender)) {
            safePath.delete()
            return Result.failure()
        }

        val encryptedBody = runCatching {
            safePath.readText(Charsets.UTF_8)
        }.getOrElse { return Result.retry() }
        if (encryptedBody.isBlank() || encryptedBody.length > MAX_ENCRYPTED_FILE_LENGTH) {
            safePath.delete()
            return Result.failure()
        }
        val smsBody = runCatching {
            PaymentSmsDeviceCredentials.decrypt(applicationContext, encryptedBody)
        }.getOrElse {
            safePath.delete()
            return Result.failure()
        }
        if (smsBody.isBlank() || smsBody.length > MAX_SMS_LENGTH) {
            safePath.delete()
            return Result.failure()
        }

        var connection: HttpURLConnection? = null
        return try {
            val configuredBase = URL(BuildConfig.JOBLY_BASE_URL)
            if (configuredBase.protocol != "https" || configuredBase.userInfo != null) {
                safePath.delete()
                return Result.failure()
            }
            val endpoint = URL(configuredBase.toString().trimEnd('/') + "/api/payments/sms/ingest")
            connection = (endpoint.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                instanceFollowRedirects = false
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
                responseCode in 200..299 -> {
                    safePath.delete()
                    Result.success()
                }
                responseCode == 408 || responseCode == 425 || responseCode == 429 || responseCode >= 500 ->
                    Result.retry()
                else -> {
                    safePath.delete()
                    Result.failure()
                }
            }
        } catch (_: IOException) {
            Result.retry()
        } catch (_: Exception) {
            safePath.delete()
            Result.failure()
        } finally {
            connection?.disconnect()
        }
    }

    companion object {
        const val KEY_DEVICE_ID = "device_id"
        const val KEY_SENDER_ID = "sender_id"
        const val KEY_ENCRYPTED_SMS_FILE = "encrypted_sms_file"
        private const val MAX_SMS_LENGTH = 5000
        private const val MAX_ENCRYPTED_FILE_LENGTH = 30000
        private const val CONNECT_TIMEOUT_MS = 8000
        private const val READ_TIMEOUT_MS = 70000
    }
}
