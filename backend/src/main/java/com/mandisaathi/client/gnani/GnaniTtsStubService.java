package com.mandisaathi.client.gnani;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "gnani.enabled", havingValue = "false", matchIfMissing = true)
public class GnaniTtsStubService implements GnaniTtsService {

    private static final Logger log = LoggerFactory.getLogger(GnaniTtsStubService.class);

    @Override
    public SynthesisResult synthesize(String text, String languageCode, String voiceGender) {
        log.info("Gnani TTS Stub received synthesis request (chars: {}, lang: {}, voice: {}).",
                text != null ? text.length() : 0, languageCode, voiceGender);
        // Returns placeholder empty audio bytes for stubbing purposes
        return SynthesisResult.success(new byte[0], "audio/wav", languageCode != null ? languageCode : "hi-IN");
    }
}

