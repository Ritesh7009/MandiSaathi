package com.mandisaathi.client.gnani;

/**
 * Service contract for Gnani Prisma v2.5 Speech-to-Text integration.
 * Implementations isolate third-party Gnani API specs behind domain abstractions.
 */
public interface GnaniSttService {

    /**
     * Transcribe speech audio into normalized text.
     *
     * @param audioData    raw audio bytes (e.g. WAV/WebM/PCM)
     * @param languageCode target language code (e.g., "hi-IN", "pa-IN", "en-IN")
     * @return structured transcription result
     */
    TranscriptionResult transcribe(byte[] audioData, String languageCode);
}

