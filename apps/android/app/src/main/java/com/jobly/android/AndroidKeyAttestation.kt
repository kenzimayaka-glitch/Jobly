package com.jobly.android

import android.os.Build
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.spec.ECGenParameterSpec
import java.security.cert.Certificate
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties

/**
 * Creates a fresh Android Keystore key with a server-issued, one-time attestation challenge.
 * The private key never leaves Android Keystore; only the X.509 attestation chain is exported.
 */
internal object AndroidKeyAttestation {
    private const val KEY_ALIAS = "jobly-hardware-attestation-v1"

    data class Result(
        val certificateChain: List<String>,
        val hardwareKeyStore: Boolean
    )

    fun createCertificateChain(challengeBase64: String): Result {
        check(Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) { "ANDROID_KEY_ATTESTATION_UNSUPPORTED" }
        val challenge = Base64.decode(challengeBase64, Base64.DEFAULT)
        require(challenge.size == 32) { "ANDROID_ATTESTATION_CHALLENGE_INVALID" }

        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS)

        val generator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            "AndroidKeyStore"
        )
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .setKeySize(256)
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setAttestationChallenge(challenge)
            .setUserAuthenticationRequired(false)
            .build()

        generator.initialize(spec)
        generator.generateKeyPair()

        val chain: Array<Certificate> = keyStore.getCertificateChain(KEY_ALIAS)
            ?: throw IllegalStateException("ANDROID_ATTESTATION_CERTIFICATE_CHAIN_MISSING")
        require(chain.size in 2..8) { "ANDROID_ATTESTATION_CERTIFICATE_CHAIN_INVALID" }

        val encoded = chain.map { certificate ->
            Base64.encodeToString(certificate.encoded, Base64.NO_WRAP)
        }
        return Result(encoded, hardwareKeyStore = true)
    }
}
