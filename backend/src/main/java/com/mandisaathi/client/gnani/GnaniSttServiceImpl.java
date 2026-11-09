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

import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Service
@ConditionalOnProperty(name = "gnani.enabled", havingValue = "true")
public class GnaniSttServiceImpl implements GnaniSttService {

    private static final Logger log = LoggerFactory.getLogger(GnaniSttServiceImpl.class);
    private static final int MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB
    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of("wav", "mp3", "ogg", "flac", "aac", "m4a");

    private final GnaniProperties gnaniProperties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Semaphore sttSemaphore;

    public GnaniSttServiceImpl(GnaniProperties gnaniProperties, RestClient restClient, ObjectMapper objectMapper) {
        this.gnaniProperties = gnaniProperties;
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.sttSemaphore = new Semaphore(gnaniProperties.maxConcurrentRequests());
    }

    @Override
    public TranscriptionResult transcribe(byte[] audioData, String languageCode) {
        return transcribe(audioData, languageCode, "recording.wav", "audio/wav");
    }

    @Override
    public TranscriptionResult transcribe(byte[] audioData, String languageCode, String filename, String contentType) {
        if (audioData == null || audioData.length == 0) {
            log.warn("Gnani STT: Empty audio payload received");
            return TranscriptionResult.failure(400, "EMPTY_AUDIO", "Audio payload is empty. Please speak clearly into the microphone.", 0, null);
        }

        if (audioData.length > MAX_AUDIO_BYTES) {
            log.warn("Gnani STT: Audio exceeds 15MB limit (size: {} bytes)", audioData.length);
            return TranscriptionResult.failure(413, "AUDIO_TOO_LARGE", "Audio recording exceeded 15MB limit. Please keep queries under 30 seconds.", 0, null);
        }

        if (!gnaniProperties.isConfigured()) {
            log.warn("Gnani STT: Credentials not configured in environment");
            return TranscriptionResult.failure(401, "MISSING_CREDENTIALS", "Gnani AI API credentials are not configured on the server.", 0, null);
        }

        // Bounded concurrency with queue timeout
        boolean acquired;
        try {
            acquired = sttSemaphore.tryAcquire(gnaniProperties.acquireTimeoutMs(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            log.warn("Gnani STT: Interrupted while waiting for concurrency permit");
            return TranscriptionResult.failure(429, "CONCURRENCY_INTERRUPTED", "Voice processing was interrupted. Please try again.", 0, null);
        }

        if (!acquired) {
            log.warn("Gnani STT: Concurrency capacity (max={}) reached. Timed out after {}ms waiting for slot.",
                    gnaniProperties.maxConcurrentRequests(), gnaniProperties.acquireTimeoutMs());
            return TranscriptionResult.failure(429, "RATE_LIMIT_OVERLOAD", "High voice traffic. Please wait a moment and try speaking again.", 0, null);
        }

        try {
            return executeTranscriptionWithRetry(audioData, languageCode, filename, contentType);
        } finally {
            sttSemaphore.release();
        }
    }

    private TranscriptionResult executeTranscriptionWithRetry(byte[] audioData, String languageCode, String filename, String contentType) {
        String targetLang = resolveLanguageCode(languageCode);
        String safeFilename = sanitizeFilename(filename);
        String endpoint = gnaniProperties.sttUrl();

        int maxAttempts = 2; // 1 initial attempt + 1 retry on 429
        int attempt = 0;

        while (attempt < maxAttempts) {
            attempt++;
            long startTime = System.currentTimeMillis();

            try {
                MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                ByteArrayResource audioResource = new ByteArrayResource(audioData) {
                    @Override
                    public String getFilename() {
                        return safeFilename;
                    }
                };

                body.add("audio_file", audioResource);
                body.add("language_code", targetLang);
                body.add("format", "transcribe");

                log.info("Dispatching to Gnani STT: endpoint='{}', filename='{}', contentType='{}', byteSize={}, lang='{}', attempt={}/{}",
                        endpoint, safeFilename, contentType, audioData.length, targetLang, attempt, maxAttempts);

                final int currentAttempt = attempt;
                class ResponseHolder {
                    int statusCode = 200;
                    String bodyString = "";
                    String retryAfter = null;
                }
                ResponseHolder holder = new ResponseHolder();

                String responseString = restClient.post()
                        .uri(endpoint)
                        .headers(headers -> headers.set("X-API-Key-ID", gnaniProperties.apiKey()))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(body)
                        .exchange((req, res) -> {
                            holder.statusCode = res.getStatusCode().value();
                            holder.retryAfter = res.getHeaders().getFirst("Retry-After");
                            byte[] respBytes = res.getBody().readAllBytes();
                            holder.bodyString = new String(respBytes, StandardCharsets.UTF_8);
                            return holder.bodyString;
                        });

                long latencyMs = System.currentTimeMillis() - startTime;
                int status = holder.statusCode;
                String rawBody = holder.bodyString != null ? holder.bodyString : "";

                // Handle HTTP 429 Rate Limit respecting Retry-After header
                if (status == 429 && currentAttempt < maxAttempts) {
                    long backoffMs = 1500;
                    if (holder.retryAfter != null) {
                        try {
                            backoffMs = Math.min(5000, Math.max(500, Long.parseLong(holder.retryAfter.trim()) * 1000));
                        } catch (NumberFormatException ignored) {}
                    }
                    log.warn("Gnani STT returned HTTP 429 (rate limit). Backing off for {}ms before retry (attempt {}/{})...",
                            backoffMs, currentAttempt, maxAttempts);
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    continue;
                }

                // Parse STT Response (Status 200 OK)
                if (status >= 200 && status < 300) {
                    JsonNode root = objectMapper.readTree(rawBody);
                    String transcript = "";

                    if (root.has("transcript")) {
                        transcript = root.get("transcript").asText("").trim();
                    } else if (root.has("output") && root.get("output").has("literal")) {
                        transcript = root.get("output").get("literal").asText("").trim();
                    } else if (root.has("text")) {
                        transcript = root.get("text").asText("").trim();
                    }

                    String detectedLang = root.has("detected_language_code")
                            ? root.get("detected_language_code").asText(targetLang)
                            : targetLang;

                    double confidence = root.has("confidence") ? root.get("confidence").asDouble(0.95) : 0.95;

                    log.info("Gnani STT response: status={}, latency={}ms, detectedLang='{}', charCount={}, confidence={}",
                            status, latencyMs, detectedLang, transcript.length(), confidence);

                    if (transcript.isBlank()) {
                        log.warn("Gnani STT: Empty transcript returned by speech engine (status={}, latency={}ms)", status, latencyMs);
                        return TranscriptionResult.failure(200, "EMPTY_TRANSCRIPT", "No speech detected in audio. Please speak clearly into the microphone.", latencyMs, rawBody);
                    }

                    return TranscriptionResult.success(transcript, detectedLang, confidence, latencyMs, rawBody);
                }

                // Parse Upstream Error Responses (HTTP 4xx / 5xx)
                String errorType = "STT_ERROR";
                String errorMessage = "Upstream STT error (HTTP " + status + ")";
                try {
                    JsonNode errNode = objectMapper.readTree(rawBody);
                    if (errNode.has("error")) {
                        JsonNode errObj = errNode.get("error");
                        if (errObj.has("type")) errorType = errObj.get("type").asText();
                        if (errObj.has("message")) errorMessage = errObj.get("message").asText();
                    } else if (errNode.has("detail")) {
                        JsonNode detObj = errNode.get("detail");
                        if (detObj.has("error_code")) errorType = detObj.get("error_code").asText();
                        if (detObj.has("message")) errorMessage = detObj.get("message").asText();
                    }
                } catch (Exception ignored) {}

                log.error("Gnani STT upstream error: status={}, error_type='{}', message='{}', latency={}ms",
                        status, errorType, errorMessage, latencyMs);

                String farmerFriendlyMsg = mapErrorToFriendlyMessage(status, errorType, errorMessage);
                return TranscriptionResult.failure(status, errorType, farmerFriendlyMsg, latencyMs, rawBody);

            } catch (ResourceAccessException ex) {
                long latencyMs = System.currentTimeMillis() - startTime;
                log.error("Gnani STT network connection timeout after {}ms: {}", latencyMs, ex.getMessage());
                return TranscriptionResult.failure(504, "TIMEOUT", "Voice request timed out (HTTP 504). Upstream speech server took too long to respond.", latencyMs, null);
            } catch (Exception ex) {
                long latencyMs = System.currentTimeMillis() - startTime;
                log.error("Gnani STT unexpected failure after {}ms: {}", latencyMs, ex.getMessage(), ex);
                return TranscriptionResult.failure(500, "INTERNAL_ERROR", "Server error processing audio: " + ex.getMessage(), latencyMs, null);
            }
        }

        return TranscriptionResult.failure(429, "RATE_LIMIT_EXCEEDED", "Gnani AI STT rate limit reached (HTTP 429). Please retry after a few seconds.", 0, null);
    }

    private String resolveLanguageCode(String code) {
        if (code == null || code.isBlank()) return "hi-IN";
        String lower = code.toLowerCase().trim();
        if (lower.startsWith("hi")) return "hi-IN";
        if (lower.startsWith("pa")) return "pa-IN";
        if (lower.startsWith("en")) return "en-IN";
        if (lower.startsWith("mr")) return "mr-IN";
        if (lower.startsWith("gu")) return "gu-IN";
        if (lower.startsWith("bn")) return "bn-IN";
        if (lower.startsWith("te")) return "te-IN";
        if (lower.startsWith("ta")) return "ta-IN";
        if (lower.startsWith("kn")) return "kn-IN";
        if (lower.startsWith("ml")) return "ml-IN";
        if (lower.startsWith("or")) return "or-IN";
        if (lower.startsWith("as")) return "as-IN";
        if (lower.startsWith("ur")) return "ur-IN";
        if (lower.startsWith("sa")) return "sa-IN";
        if (lower.startsWith("ks")) return "ks-IN";
        if (lower.startsWith("kok")) return "kok-IN";
        if (lower.startsWith("mai")) return "mai-IN";
        if (lower.startsWith("doi")) return "doi-IN";
        if (lower.startsWith("brx")) return "brx-IN";
        if (lower.startsWith("sat")) return "sat-IN";
        if (lower.startsWith("ne")) return "ne-IN";
        if (lower.startsWith("sd")) return "sd-IN";
        if (lower.startsWith("mni")) return "mni-IN";
        return "hi-IN";
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) return "recording.wav";
        int dotIdx = filename.lastIndexOf('.');
        if (dotIdx > 0) {
            String ext = filename.substring(dotIdx + 1).toLowerCase();
            if (SUPPORTED_EXTENSIONS.contains(ext)) {
                return filename;
            }
        }
        return "recording.wav";
    }

    private String mapErrorToFriendlyMessage(int status, String errorType, String upstreamMsg) {
        if (status == 401 || status == 403) {
            return "Gnani AI authentication failure: Invalid API key or credits exhausted (HTTP " + status + ").";
        }
        if (status == 402) {
            return "Gnani AI account credits exhausted (HTTP 402).";
        }
        if (status == 429) {
            return "Gnani AI STT rate limit reached (HTTP 429). Please wait a moment and try again.";
        }
        if (status == 400 && "AUDIO_CONVERSION_ERROR".equalsIgnoreCase(errorType)) {
            return "Audio format not supported by speech engine. Please record in 16 kHz WAV format.";
        }
        return "Speech engine error (HTTP " + status + "): " + upstreamMsg;
    }
}
