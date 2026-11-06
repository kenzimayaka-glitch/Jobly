package com.jobly.android

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * System SMS_RECEIVED listener. It queues only messages from a unique allowlisted
 * merchant profile. The message is encrypted before being written to app-private
 * storage; WorkManager receives only a short path and device ID.
 */
class PaymentSmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = runCatching { Telephony.Sms.Intents.getMessagesFromIntent(intent) }.getOrNull()
            ?: return
        if (messages.isEmpty()) return
        val senderId = messages.firstOrNull()?.originatingAddress?.trim().orEmpty()
        val smsBody = messages.joinToString(separator = "") { it.messageBody.orEmpty() }.trim()
        if (senderId.isBlank() || smsBody.isBlank() || smsBody.length > MAX_SMS_LENGTH) return

        // A shared sender ID across two registered merchant profiles is ambiguous
        // and is deliberately not uploaded.
        val credentials = PaymentSmsDeviceCredentials.findUniqueForSender(context, senderId) ?: return
        val queueDir = queueDirectory(context)
        if (!queueDir.exists() && !queueDir.mkdirs()) return

        val fingerprint = sha256(senderId + "\n" + smsBody)
        val encryptedBody = runCatching {
            PaymentSmsDeviceCredentials.encrypt(context, smsBody)
        }.getOrNull() ?: return

        val queuedFile = File(queueDir, credentials.deviceId + "__" + UUID.randomUUID() + ".enc")
        try {
            queuedFile.writeText(encryptedBody, Charsets.UTF_8)
        } catch (_: Exception) {
            queuedFile.delete()
            return
        }

        val request = OneTimeWorkRequestBuilder<PaymentSmsUploadWorker>()
            .setInputData(
                workDataOf(
                    PaymentSmsUploadWorker.KEY_DEVICE_ID to credentials.deviceId,
                    PaymentSmsUploadWorker.KEY_SENDER_ID to senderId,
                    PaymentSmsUploadWorker.KEY_ENCRYPTED_SMS_FILE to queuedFile.absolutePath
                )
            )
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .addTag(WORK_TAG)
            .addTag(deviceTag(credentials.deviceId))
            .build()

        try {
            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_PREFIX + credentials.deviceId + "-" + fingerprint,
                ExistingWorkPolicy.KEEP,
                request
            )
        } catch (_: Exception) {
            queuedFile.delete()
        }
    }

    private fun sha256(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

    companion object {
        const val WORK_TAG = "jobly-payment-sms-upload"
        private const val MAX_SMS_LENGTH = 5000
        private const val WORK_PREFIX = "jobly-payment-sms-"
        private const val QUEUE_DIRECTORY = "payment_sms_queue"

        fun deviceTag(deviceId: String): String = WORK_TAG + ":" + deviceId

        fun queueDirectory(context: Context): File =
            File(context.noBackupFilesDir, QUEUE_DIRECTORY)

        fun deleteQueuedFiles(context: Context, deviceId: String) {
            val prefix = deviceId + "__"
            queueDirectory(context).listFiles()
                ?.filter { it.isFile && it.name.startsWith(prefix) && it.name.endsWith(".enc") }
                ?.forEach { it.delete() }
        }
    }
}
