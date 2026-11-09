package com.mandisaathi.client.gnani;

public interface GnaniSttService {
    TranscriptionResult transcribe(byte[] audioData, String languageCode);

    default TranscriptionResult transcribe(byte[] audioData, String languageCode, String filename, String contentType) {
        return transcribe(audioData, languageCode);
    }
}
