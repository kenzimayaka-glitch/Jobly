# Android framework entry points are declared in the manifest.

# WorkManager stores worker class names and creates workers reflectively.
# Keep the upload worker's runtime entry point stable across R8 minification.
-keepnames class com.jobly.android.PaymentSmsUploadWorker
-keep class com.jobly.android.PaymentSmsUploadWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
