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
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

/**
 * System SMS_RECEIVED listener. It queues only when this Jobly installation has
 * been paired as an authorized merchant handset. No SMS content is logged.
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
        val credentials = PaymentSmsDeviceCredentials.findUniqueForSender(context, senderId) ?: return

        val encryptedBody = runCatching {
            PaymentSmsDeviceCredentials.encrypt(context, smsBody)
        }.getOrNull() ?: return
        val fingerprint = sha256(senderId + "\n" + smsBody)
        val request = OneTimeWorkRequestBuilder<PaymentSmsUploadWorker>()
            .setInputData(
                workDataOf(
                    PaymentSmsUploadWorker.KEY_DEVICE_ID to credentials.deviceId,
                    PaymentSmsUploadWorker.KEY_SENDER_ID to senderId,
                    PaymentSmsUploadWorker.KEY_ENCRYPTED_SMS_BODY to encryptedBody
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

        WorkManager.getInstance(context).enqueueUniqueWork(
            WORK_PREFIX + credentials.deviceId + "-" + fingerprint,
            ExistingWorkPolicy.KEEP,
            request
        )
    }

    private fun sha256(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

    companion object {
        private const val MAX_SMS_LENGTH = 5000
        private const val WORK_PREFIX = "jobly-payment-sms-"
        const val WORK_TAG = "jobly-payment-sms-upload"
        fun deviceTag(deviceId: String): String = WORK_TAG + ":" + deviceId
    }
}
