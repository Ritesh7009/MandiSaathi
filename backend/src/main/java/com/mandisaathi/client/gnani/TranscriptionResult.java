package com.mandisaathi.client.gnani;

public record TranscriptionResult(
        String transcript,
        String detectedLanguage,
        double confidence,
        boolean success,
        String errorMessage,
        int statusCode,
        String errorCode,
        long latencyMs,
        String rawResponse
) {
    public static TranscriptionResult success(String transcript, String language, double confidence, long latencyMs, String rawResponse) {
        return new TranscriptionResult(transcript, language, confidence, true, null, 200, null, latencyMs, rawResponse);
    }

    public static TranscriptionResult success(String transcript, String language, double confidence) {
        return new TranscriptionResult(transcript, language, confidence, true, null, 200, null, 0, null);
    }

    public static TranscriptionResult failure(String errorMessage) {
        return new TranscriptionResult("", "", 0.0, false, errorMessage, 500, "STT_ERROR", 0, null);
    }

    public static TranscriptionResult failure(int statusCode, String errorCode, String errorMessage, long latencyMs, String rawResponse) {
        return new TranscriptionResult("", "", 0.0, false, errorMessage, statusCode, errorCode, latencyMs, rawResponse);
    }
}
