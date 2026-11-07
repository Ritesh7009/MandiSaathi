package com.mandisaathi.client.gnani;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.config.GnaniProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
@ConditionalOnProperty(name = "gnani.enabled", havingValue = "true")
public class GnaniSttServiceImpl implements GnaniSttService {

    private static final Logger log = LoggerFactory.getLogger(GnaniSttServiceImpl.class);
    private static final int MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB max limit

    private final GnaniProperties gnaniProperties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GnaniSttServiceImpl(GnaniProperties gnaniProperties, RestClient restClient, ObjectMapper objectMapper) {
        this.gnaniProperties = gnaniProperties;
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public TranscriptionResult transcribe(byte[] audioData, String languageCode) {
        if (audioData == null || audioData.length == 0) {
            log.warn("Gnani STT rejected empty audio payload");
            return TranscriptionResult.failure("Audio payload is empty. Please speak clearly into the microphone.");
        }

        if (audioData.length > MAX_AUDIO_BYTES) {
            log.warn("Gnani STT rejected audio payload exceeding max size: {} bytes", audioData.length);
            return TranscriptionResult.failure("Audio recording exceeded 15MB limit. Please keep queries under 30 seconds.");
        }

        if (!gnaniProperties.isConfigured()) {
            log.warn("Gnani STT requested but credentials are not configured in environment");
            return TranscriptionResult.failure("Gnani AI API credentials are not configured on the server.");
        }

        String targetLang = (languageCode != null && !languageCode.isBlank()) ? languageCode : "hi-IN";
        String endpoint = gnaniProperties.sttUrl();

        log.info("Dispatching audio ({} bytes, target lang: {}, model: {}) to Gnani Prisma STT",
                audioData.length, targetLang, gnaniProperties.sttModel());

        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            ByteArrayResource audioResource = new ByteArrayResource(audioData) {
                @Override
                public String getFilename() {
                    return "audio.wav";
                }
            };
            body.add("audio_file", audioResource);
            body.add("language_code", targetLang);
            body.add("model", gnaniProperties.sttModel());

            String responseString = restClient.post()
                    .uri(endpoint)
                    .headers(headers -> {
                        headers.set(gnaniProperties.getEffectiveAuthHeaderKey(), gnaniProperties.getEffectiveAuthHeaderValue());
                        if (gnaniProperties.token() != null && !gnaniProperties.token().isBlank()) {
                            headers.set("token", gnaniProperties.token());
                        }
                    })
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        String statusText = res.getStatusText();
                        log.error("Gnani STT upstream error: HTTP {} {}", status, statusText);
                        if (status == 401 || status == 403) {
                            throw new GnaniApiException("Gnani AI authentication failure: Invalid API Key or Token.");
                        } else if (status == 429) {
                            throw new GnaniApiException("Gnani AI STT rate limit reached. Please retry in a few moments.");
                        } else {
                            throw new GnaniApiException("Gnani AI STT upstream error (HTTP " + status + ").");
                        }
                    })
                    .body(String.class);

            if (responseString == null || responseString.isBlank()) {
                log.warn("Gnani STT returned empty response body");
                return TranscriptionResult.failure("Empty response received from Gnani speech engine.");
            }

            JsonNode root = objectMapper.readTree(responseString);
            String transcript = "";
            if (root.has("transcript")) {
                transcript = root.get("transcript").asText("").trim();
            } else if (root.has("text")) {
                transcript = root.get("text").asText("").trim();
            }

            String detectedLang = root.has("detected_language_code")
                    ? root.get("detected_language_code").asText(targetLang)
                    : targetLang;

            double confidence = root.has("confidence") ? root.get("confidence").asDouble(0.95) : 0.95;

            log.info("Gnani Prisma STT completed successfully. Detected lang: {}, Transcript length: {}",
                    detectedLang, transcript.length());

            return TranscriptionResult.success(transcript, detectedLang, confidence);

        } catch (GnaniApiException ex) {
            return TranscriptionResult.failure(ex.getMessage());
        } catch (ResourceAccessException ex) {
            log.error("Gnani STT network connection timed out: {}", ex.getMessage());
            return TranscriptionResult.failure("Gnani AI STT service timed out. Check network connection.");
        } catch (RestClientResponseException ex) {
            log.error("Gnani STT HTTP exception: status {}", ex.getStatusCode().value());
            return TranscriptionResult.failure("Gnani STT service error: HTTP " + ex.getStatusCode().value());
        } catch (Exception ex) {
            log.error("Unexpected error in Gnani STT transcription: {}", ex.getMessage());
            return TranscriptionResult.failure("Unable to transcribe speech audio: " + ex.getMessage());
        }
    }
}
