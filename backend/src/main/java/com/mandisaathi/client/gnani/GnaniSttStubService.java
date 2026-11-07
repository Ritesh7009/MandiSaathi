package com.mandisaathi.client.gnani;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "gnani.enabled", havingValue = "false", matchIfMissing = true)
public class GnaniSttStubService implements GnaniSttService {

    private static final Logger log = LoggerFactory.getLogger(GnaniSttStubService.class);

    @Override
    public TranscriptionResult transcribe(byte[] audioData, String languageCode) {
        log.info("Gnani STT Stub received audio payload ({} bytes, lang: {}). Returning stub transcription.",
                audioData != null ? audioData.length : 0, languageCode);
        return TranscriptionResult.success("गेहूं का भाव क्या है", languageCode != null ? languageCode : "hi-IN", 0.95);
    }
}

