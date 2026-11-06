plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val joblyBaseUrl = providers.gradleProperty("joblyBaseUrl")
    .orElse("https://jobly-c0651.vercel.app")
    .get()
    .trimEnd('/')
val releaseStoreFile = providers.gradleProperty("joblyReleaseStoreFile")
    .orElse(providers.environmentVariable("JOBLY_ANDROID_KEYSTORE_PATH"))
    .orElse("")
    .get()
val releaseStorePassword = providers.gradleProperty("joblyReleaseStorePassword")
    .orElse(providers.environmentVariable("JOBLY_ANDROID_KEYSTORE_PASSWORD"))
    .orElse("")
    .get()
val releaseKeyAlias = providers.gradleProperty("joblyReleaseKeyAlias")
    .orElse(providers.environmentVariable("JOBLY_ANDROID_KEY_ALIAS"))
    .orElse("")
    .get()
val releaseKeyPassword = providers.gradleProperty("joblyReleaseKeyPassword")
    .orElse(providers.environmentVariable("JOBLY_ANDROID_KEY_PASSWORD"))
    .orElse("")
    .get()
val releaseCertificateSha256 = providers.gradleProperty("joblyReleaseCertificateSha256")
    .orElse(providers.environmentVariable("JOBLY_ANDROID_RELEASE_CERT_SHA256"))
    .orElse("")
    .get()
    .filterNot { it == ':' || it.isWhitespace() }
    .uppercase()

val releaseBuildRequested = gradle.startParameter.taskNames.any { it.contains("release", ignoreCase = true) }
if (releaseBuildRequested) {
    require(
        releaseStoreFile.isNotBlank() &&
            releaseStorePassword.isNotBlank() &&
            releaseKeyAlias.isNotBlank() &&
            releaseKeyPassword.isNotBlank()
    ) {
        "Release APK signing is mandatory. Configure JOBLY_ANDROID_KEYSTORE_PATH, JOBLY_ANDROID_KEYSTORE_PASSWORD, JOBLY_ANDROID_KEY_ALIAS and JOBLY_ANDROID_KEY_PASSWORD."
    }
    require(releaseCertificateSha256.matches(Regex("^[A-F0-9]{64}$"))) {
        "Release APK signing is mandatory. Configure JOBLY_ANDROID_RELEASE_CERT_SHA256 with the signing certificate SHA-256 fingerprint."
    }
}

android {
    namespace = "com.jobly.android"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jobly.android"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "JOBLY_BASE_URL", "\"$joblyBaseUrl\"")
        buildConfigField("String", "JOBLY_RELEASE_CERT_SHA256", "\"$releaseCertificateSha256\"")
    }

    signingConfigs {
        create("joblyRelease") {
            if (releaseStoreFile.isNotBlank()) {
                storeFile = rootProject.file(releaseStoreFile)
            }
            storeType = "PKCS12"
            storePassword = releaseStorePassword.takeIf { it.isNotBlank() }
            keyAlias = releaseKeyAlias.takeIf { it.isNotBlank() }
            keyPassword = releaseKeyPassword.takeIf { it.isNotBlank() }
        }
    }
    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("joblyRelease")
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.18.0")
    implementation("androidx.work:work-runtime:2.10.1")

    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:core:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
