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
        String code = (lang.length() >= 2) ? lang.toLowerCase().substring(0, 2) : "hi";
        String sampleQuery = switch (code) {
            case "pa" -> "ਕਣਕ ਦਾ ਭਾਅ ਕੀ ਹੈ";
            case "en" -> "What is the wheat price in mandi";
            case "mr" -> "गव्हाचा भाव काय आहे";
            case "gu" -> "કપાસનો ભાવ શું છે";
            case "bn" -> "গমের দাম কত";
            case "te" -> "వరి ధర ఎంత";
            case "ta" -> "நெல் விலை என்ன";
            case "kn" -> "ಭತ್ತದ ದರ ಎಷ್ಟು";
            default -> "आज पंजाब में गेहूं का भाव क्या चल रहा है";
        };
        return TranscriptionResult.success(sampleQuery, lang, 0.95);
    }
}
