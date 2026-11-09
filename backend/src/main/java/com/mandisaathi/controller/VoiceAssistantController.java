package com.mandisaathi.controller;

import com.mandisaathi.dto.VoiceQueryRequest;
import com.mandisaathi.dto.VoiceQueryResponse;
import com.mandisaathi.service.VoiceAssistantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/voice")
public class VoiceAssistantController {

    private static final Logger log = LoggerFactory.getLogger(VoiceAssistantController.class);

    private final VoiceAssistantService voiceAssistantService;

    public VoiceAssistantController(VoiceAssistantService voiceAssistantService) {
        this.voiceAssistantService = voiceAssistantService;
    }

    @PostMapping("/query")
    public ResponseEntity<VoiceQueryResponse> processQuery(@RequestBody VoiceQueryRequest request) {
        return ResponseEntity.ok(voiceAssistantService.processTextQuery(request));
    }

    @PostMapping(value = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VoiceQueryResponse> processAudio(
            @RequestParam("audio") MultipartFile audioFile,
            @RequestParam(value = "language", required = false) String language
    ) throws IOException {
        long startTime = System.currentTimeMillis();
        String contentType = audioFile != null ? audioFile.getContentType() : "unknown";
        String filename = audioFile != null ? audioFile.getOriginalFilename() : "unknown";
        long byteSize = audioFile != null ? audioFile.getSize() : 0;

        if (audioFile == null || audioFile.isEmpty()) {
            log.warn("Voice request rejected: Empty audio payload. filename='{}', contentType='{}', byteSize={}",
                    filename, contentType, byteSize);
            return ResponseEntity.badRequest().body(new VoiceQueryResponse(
                    "",
                    language != null ? language : "hi-IN",
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

        byte[] audioBytes = audioFile.getBytes();
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
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
        }

        return ResponseEntity.ok(response);
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
