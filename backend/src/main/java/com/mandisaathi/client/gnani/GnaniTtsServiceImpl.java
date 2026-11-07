package com.mandisaathi.client.gnani;

import com.mandisaathi.config.GnaniProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.HashMap;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "gnani.enabled", havingValue = "true")
public class GnaniTtsServiceImpl implements GnaniTtsService {

    private static final Logger log = LoggerFactory.getLogger(GnaniTtsServiceImpl.class);

    private final GnaniProperties gnaniProperties;
    private final RestClient restClient;

    public GnaniTtsServiceImpl(GnaniProperties gnaniProperties, RestClient restClient) {
        this.gnaniProperties = gnaniProperties;
        this.restClient = restClient;
    }

    @Override
    public SynthesisResult synthesize(String text, String languageCode, String voiceGender) {
        if (text == null || text.isBlank()) {
            log.warn("Gnani TTS rejected empty text payload");
            return SynthesisResult.failure("Text payload is empty. Nothing to synthesize.");
        }

        if (!gnaniProperties.isConfigured()) {
            log.warn("Gnani TTS requested but credentials are not configured in environment");
            return SynthesisResult.failure("Gnani AI API credentials are not configured on the server.");
        }

        String targetLang = (languageCode != null && !languageCode.isBlank()) ? languageCode : "hi-IN";
        String voice = resolveVoice(targetLang, voiceGender);
        String endpoint = gnaniProperties.ttsUrl();

        log.info("Dispatching TTS synthesis (text chars: {}, lang: {}, voice: {}, model: {}) to Gnani Timbre",
                text.length(), targetLang, voice, gnaniProperties.ttsModel());

        try {
            Map<String, Object> audioConfig = new HashMap<>();
            audioConfig.put("sample_rate", 22050);
            audioConfig.put("num_channels", 1);
            audioConfig.put("sample_width", 2);
            audioConfig.put("encoding", "linear_pcm");
            audioConfig.put("container", "wav");

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("text", text);
            requestBody.put("voice", voice);
            requestBody.put("model", gnaniProperties.ttsModel());
            requestBody.put("language", targetLang);
            requestBody.put("speed", 1.0);
            requestBody.put("audio_config", audioConfig);

            byte[] audioBytes = restClient.post()
                    .uri(endpoint)
                    .headers(headers -> headers.set("X-API-Key-ID", gnaniProperties.apiKey()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        String statusText = res.getStatusText();
                        log.error("Gnani TTS upstream error: HTTP {} {}", status, statusText);
                        if (status == 401 || status == 403) {
                            throw new GnaniApiException("Gnani AI authentication failure: Invalid API Key or Token.");
                        } else if (status == 429) {
                            throw new GnaniApiException("Gnani AI TTS rate limit reached. Please retry in a few moments.");
                        } else {
                            throw new GnaniApiException("Gnani AI TTS upstream error (HTTP " + status + ").");
                        }
                    })
                    .body(byte[].class);

            if (audioBytes == null || audioBytes.length == 0) {
                log.warn("Gnani TTS returned empty audio bytes");
                return SynthesisResult.failure("Empty audio stream received from Gnani Timbre engine.");
            }

            log.info("Gnani Timbre TTS synthesized {} bytes of audio/wav successfully", audioBytes.length);
            return SynthesisResult.success(audioBytes, "audio/wav", targetLang);

        } catch (GnaniApiException ex) {
            return SynthesisResult.failure(ex.getMessage());
        } catch (ResourceAccessException ex) {
            log.error("Gnani TTS network connection timed out: {}", ex.getMessage());
            return SynthesisResult.failure("Gnani AI TTS service timed out. Check network connection.");
        } catch (RestClientResponseException ex) {
            log.error("Gnani TTS HTTP exception: status {}", ex.getStatusCode().value());
            return SynthesisResult.failure("Gnani TTS service error: HTTP " + ex.getStatusCode().value());
        } catch (Exception ex) {
            log.error("Unexpected error in Gnani TTS synthesis: {}", ex.getMessage());
            return SynthesisResult.failure("Unable to synthesize speech audio: " + ex.getMessage());
        }
    }

    private String resolveVoice(String languageCode, String voiceGender) {
        String lang = languageCode != null ? languageCode.toLowerCase() : "hi-in";
        if (lang.startsWith("pa")) {
            return gnaniProperties.ttsVoicePunjabi();
        } else if (lang.startsWith("en")) {
            return gnaniProperties.ttsVoiceEnglish();
        } else {
            return gnaniProperties.ttsVoiceHindi();
        }
    }
}

