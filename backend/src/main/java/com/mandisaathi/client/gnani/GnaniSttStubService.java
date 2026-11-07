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
        log.info("Gnani STT Stub received audio payload ({} bytes, lang: {}). Returning offline stub transcription.",
                audioData != null ? audioData.length : 0, languageCode);
        String lang = languageCode != null ? languageCode : "hi-IN";
        String sampleQuery = switch (lang.toLowerCase().substring(0, 2)) {
            case "pa" -> "ਕਣਕ ਦਾ ਭਾਅ ਕੀ ਹੈ";
            case "en" -> "What is the wheat price in mandi";
            default -> "आज पंजाब में गेहूं का भाव क्या चल रहा है";
        };
        return TranscriptionResult.success(sampleQuery, lang, 0.95);
    }
}
