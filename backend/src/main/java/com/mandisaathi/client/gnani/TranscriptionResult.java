package com.mandisaathi.client.gnani;

public record TranscriptionResult(
        String transcript,
        String detectedLanguage,
        double confidence,
        boolean success,
        String errorMessage
) {
    public static TranscriptionResult success(String transcript, String language, double confidence) {
        return new TranscriptionResult(transcript, language, confidence, true, null);
    }

    public static TranscriptionResult failure(String errorMessage) {
        return new TranscriptionResult("", "", 0.0, false, errorMessage);
    }
}

