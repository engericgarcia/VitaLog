plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "br.com.vitalog.triagem"
    compileSdk = 36

    defaultConfig {
        applicationId = "br.com.vitalog.triagem"
        // 26 (Android 8) cobre praticamente todo aparelho em uso e libera
        // ícone adaptativo, o que dispensa manter cinco densidades de PNG.
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        // A origem vive aqui e não no código: trocar para um servidor local
        // durante o desenvolvimento vira uma linha, sem recompilar lógica.
        buildConfigField("String", "API_BASE", "\"https://vita-log-eight.vercel.app\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.kotlinx.serialization.json)
    debugImplementation(libs.androidx.ui.tooling)
}
