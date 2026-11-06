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
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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

    buildTypes {
        release {
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
