package com.mandisaathi.client.gnani;

/**
 * Service contract for Gnani Timbre v2.5 Text-to-Speech integration.
 * Implementations isolate third-party Gnani API specs behind domain abstractions.
 */
public interface GnaniTtsService {

    /**
     * Synthesize domain text into spoken audio stream.
     *
     * @param text         text to synthesize in vernacular script
     * @param languageCode language code (e.g. "hi-IN", "pa-IN", "en-IN")
     * @param voiceGender  preferred voice gender ("female", "male")
     * @return structured synthesis result containing audio bytes
     */
    SynthesisResult synthesize(String text, String languageCode, String voiceGender);
}

