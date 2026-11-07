package com.mandisaathi.client.gnani;

public record SynthesisResult(
        byte[] audioData,
        String mimeType,
        String language,
        boolean success,
        String errorMessage
) {
    public static SynthesisResult success(byte[] audioData, String mimeType, String language) {
        return new SynthesisResult(audioData, mimeType, language, true, null);
    }

    public static SynthesisResult failure(String errorMessage) {
        return new SynthesisResult(new byte[0], "", "", false, errorMessage);
    }
}

