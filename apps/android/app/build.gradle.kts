plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val joblyBaseUrl = providers.gradleProperty("joblyBaseUrl")
    .orElse("https://jobly-c0651.vercel.app")
    .get()
    .trimEnd('/')

android {
    namespace = "com.jobly.android"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jobly.android"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "JOBLY_BASE_URL", "\"$joblyBaseUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.18.0")
}
