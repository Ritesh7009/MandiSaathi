package com.mandisaathi.controller;

import com.mandisaathi.dto.VoiceQueryRequest;
import com.mandisaathi.dto.VoiceQueryResponse;
import com.mandisaathi.service.VoiceAssistantService;
import com.mandisaathi.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/v1/voice")
public class VoiceAssistantController {

    private static final Logger log = LoggerFactory.getLogger(VoiceAssistantController.class);
    private static final int MAX_VOICE_REQUESTS_PER_MINUTE = 30;
    private static final long MAX_AUDIO_BYTES = 15L * 1024L * 1024L;

    private final VoiceAssistantService voiceAssistantService;
    private final ConcurrentHashMap<String, AtomicInteger> voiceRateMap = new ConcurrentHashMap<>();

    public VoiceAssistantController(VoiceAssistantService voiceAssistantService) {
        this.voiceAssistantService = voiceAssistantService;
    }

    @PostMapping("/query")
    public ResponseEntity<VoiceQueryResponse> processQuery(
            @RequestBody VoiceQueryRequest request,
            HttpServletRequest httpRequest
    ) {
        if (!checkRateLimit(httpRequest)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, "60")
                    .body(buildRateLimitResponse(request.language()));
        }
        return ResponseEntity.ok(voiceAssistantService.processTextQuery(request));
    }

    @PostMapping(value = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VoiceQueryResponse> processAudio(
            @RequestParam("audio") MultipartFile audioFile,
            @RequestParam(value = "language", required = false) String language,
            HttpServletRequest httpRequest
    ) throws IOException {
        String defaultLang = language != null ? language : "hi-IN";

        if (!checkRateLimit(httpRequest)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, "60")
                    .body(buildRateLimitResponse(defaultLang));
        }

        long startTime = System.currentTimeMillis();
        String contentType = audioFile != null ? audioFile.getContentType() : "unknown";
        String filename = audioFile != null ? audioFile.getOriginalFilename() : "unknown";
        long byteSize = audioFile != null ? audioFile.getSize() : 0;

        if (audioFile == null || audioFile.isEmpty()) {
            log.warn("Voice request rejected: Empty audio payload. filename='{}', contentType='{}', byteSize={}",
                    filename, contentType, byteSize);
            return ResponseEntity.badRequest().body(new VoiceQueryResponse(
                    "",
                    defaultLang,
                    "UNKNOWN",
                    Map.of(),
                    List.of(),
                    "No audio received. Please try speaking again.",
                    "कोई ऑडियो प्राप्त नहीं हुआ। कृपया दोबारा बोलें।",
                    "ਕੋਈ ਆਡੀਓ ਨਹੀਂ ਮਿਲੀ।",
                    null,
                    "MandiSaathi Engine",
                    "",
                    "FAILED",
                    false,
                    "Audio payload is empty.",
                    List.of(),
                    0L,
                    0L,
                    400,
                    "EMPTY_AUDIO"
            ));
        }

        // Fast-fail large files before reading full byte array into heap
        if (byteSize > MAX_AUDIO_BYTES) {
            log.warn("Voice request rejected: Audio size {} exceeds limit {} bytes", byteSize, MAX_AUDIO_BYTES);
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new VoiceQueryResponse(
                    "",
                    defaultLang,
                    "UNKNOWN",
                    Map.of(),
                    List.of(),
                    "Audio recording too large. Maximum size is 15MB.",
                    "ऑडियो रिकॉर्डिंग बहुत बड़ी है। अधिकतम आकार 15MB है।",
                    "ਆਡੀਓ ਫ਼ਾਈਲ ਬਹੁਤ ਵੱਡੀ ਹੈ।",
                    null,
                    "MandiSaathi Engine",
                    "",
                    "FAILED",
                    false,
                    "Audio payload exceeds 15MB limit.",
                    List.of(),
                    0L,
                    0L,
                    413,
                    "AUDIO_TOO_LARGE"
            ));
        }

        byte[] audioBytes = audioFile.getBytes();

        // Validate audio container magic bytes to reject arbitrary binary upload attacks
        if (!isValidAudio(audioBytes, contentType, filename)) {
            log.warn("Voice request rejected: Invalid audio header signature for filename='{}', contentType='{}'",
                    filename, contentType);
            return ResponseEntity.badRequest().body(new VoiceQueryResponse(
                    "",
                    defaultLang,
                    "UNKNOWN",
                    Map.of(),
                    List.of(),
                    "Unsupported audio format. Please provide a valid WAV, WebM, MP3, OGG, FLAC, or AAC recording.",
                    "असमर्थित ऑडियो प्रारूप। कृपया वैध रिकॉर्डिंग प्रदान करें।",
                    "ਗ਼ੈਰ-ਮਨਜ਼ੂਰਸ਼ੁਦਾ ਆਡੀਓ ਫਾਰਮੈਟ।",
                    null,
                    "MandiSaathi Engine",
                    "",
                    "FAILED",
                    false,
                    "Invalid audio container signature.",
                    List.of(),
                    0L,
                    0L,
                    400,
                    "INVALID_AUDIO_FORMAT"
            ));
        }

        Double durationSec = calculateWavDurationSeconds(audioBytes);
        String durationStr = durationSec != null ? String.format("%.2fs", durationSec) : "unknown";

        log.info("Voice audio upload received: filename='{}', contentType='{}', byteSize={} bytes, duration={}, lang='{}'",
                filename, contentType, byteSize, durationStr, language);

        VoiceQueryResponse response = voiceAssistantService.processAudioQuery(audioBytes, language, filename, contentType, durationSec);
        long totalLatencyMs = System.currentTimeMillis() - startTime;

        int transcriptLen = response.transcript() != null ? response.transcript().length() : 0;
        log.info("Voice audio request finished: filename='{}', totalLatency={}ms, sttLatency={}ms, status={}, charCount={}, intent='{}'",
                filename, totalLatencyMs, response.sttLatencyMs(), response.statusCode(), transcriptLen, response.intent());

        if (response.statusCode() != null && response.statusCode() == 429) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, "60")
                    .body(response);
        }

        return ResponseEntity.ok(response);
    }

    private boolean checkRateLimit(HttpServletRequest request) {
        String clientIp = ClientIpResolver.resolve(request);
        long currentMinute = System.currentTimeMillis() / 60000;
        String rateKey = clientIp + ":" + currentMinute;

        voiceRateMap.entrySet().removeIf(e -> {
            String[] parts = e.getKey().split(":");
            if (parts.length < 2) return true;
            try {
                return Long.parseLong(parts[1]) < currentMinute - 2;
            } catch (NumberFormatException ignored) {
                return true;
            }
        });

        AtomicInteger counter = voiceRateMap.computeIfAbsent(rateKey, k -> new AtomicInteger(0));
        return counter.incrementAndGet() <= MAX_VOICE_REQUESTS_PER_MINUTE;
    }

    private VoiceQueryResponse buildRateLimitResponse(String language) {
        String lang = (language != null && !language.isBlank()) ? language : "hi-IN";
        return new VoiceQueryResponse(
                "",
                lang,
                "UNKNOWN",
                Map.of(),
                List.of(),
                "Too many voice requests. Please wait a minute before querying again.",
                "बहुत सारे वॉइस अनुरोध। कृपया एक मिनट प्रतीक्षा करने के बाद पुनः प्रयास करें।",
                "ਬਹੁਤ ਸਾਰੀਆਂ ਬੇਨਤੀਆਂ। ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਮਿੰਟ ਉਡੀਕ ਕਰੋ।",
                null,
                "MandiSaathi Engine",
                "",
                "FAILED",
                false,
                "Rate limit exceeded (30 requests/min).",
                List.of(),
                0L,
                0L,
                429,
                "RATE_LIMITED"
        );
    }

    private boolean isValidAudio(byte[] bytes, String contentType, String filename) {
        if (bytes == null || bytes.length == 0) return false;
        if (bytes.length < 12) {
            return (contentType != null && contentType.startsWith("audio/")) ||
                   (filename != null && (filename.endsWith(".wav") || filename.endsWith(".mp3") || filename.endsWith(".webm") || filename.endsWith(".ogg")));
        }
        if (isValidAudioHeader(bytes)) {
            return true;
        }
        return (contentType != null && contentType.startsWith("audio/")) &&
               (filename != null && (filename.endsWith(".wav") || filename.endsWith(".mp3") || filename.endsWith(".webm") || filename.endsWith(".ogg") || filename.endsWith(".m4a") || filename.endsWith(".flac")));
    }

    private boolean isValidAudioHeader(byte[] bytes) {
        if (bytes == null || bytes.length < 12) return false;
        // RIFF ... WAVE
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
            bytes[8] == 'W' && bytes[9] == 'A' && bytes[10] == 'V' && bytes[11] == 'E') {
            return true;
        }
        // WebM / EBML container: 0x1A 0x45 0xDF 0xA3 (standard browser MediaRecorder audio/webm)
        if ((bytes[0] & 0xFF) == 0x1A && (bytes[1] & 0xFF) == 0x45 && (bytes[2] & 0xFF) == 0xDF && (bytes[3] & 0xFF) == 0xA3) {
            return true;
        }
        // OggS
        if (bytes[0] == 'O' && bytes[1] == 'g' && bytes[2] == 'g' && bytes[3] == 'S') {
            return true;
        }
        // FLAC: fLaC
        if (bytes[0] == 'f' && bytes[1] == 'L' && bytes[2] == 'a' && bytes[3] == 'C') {
            return true;
        }
        // MP3 ID3 tag: ID3
        if (bytes[0] == 'I' && bytes[1] == 'D' && bytes[2] == '3') {
            return true;
        }
        // MP3 sync frame: 0xFF and (0xFB, 0xF3, 0xF2, 0xE0..)
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xE0) == 0xE0) {
            return true;
        }
        // ISO BMFF (M4A/AAC): contains "ftyp" in first 12 bytes
        if (bytes[4] == 'f' && bytes[5] == 't' && bytes[6] == 'y' && bytes[7] == 'p') {
            return true;
        }
        return false;
    }

    private Double calculateWavDurationSeconds(byte[] bytes) {
        if (bytes == null || bytes.length < 44) return null;
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
            bytes[8] == 'W' && bytes[9] == 'A' && bytes[10] == 'V' && bytes[11] == 'E') {
            int byteRate = (bytes[28] & 0xFF) | ((bytes[29] & 0xFF) << 8) | ((bytes[30] & 0xFF) << 16) | ((bytes[31] & 0xFF) << 24);
            if (byteRate > 0) {
                long dataSize = bytes.length - 44;
                return (double) dataSize / byteRate;
            }
        }
        return null;
    }
}
