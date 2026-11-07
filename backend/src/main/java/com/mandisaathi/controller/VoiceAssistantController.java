package com.mandisaathi.controller;

import com.mandisaathi.dto.VoiceQueryRequest;
import com.mandisaathi.dto.VoiceQueryResponse;
import com.mandisaathi.service.VoiceAssistantService;
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
        if (audioFile == null || audioFile.isEmpty()) {
            return ResponseEntity.badRequest().body(new VoiceQueryResponse(
                    "",
                    language != null ? language : "hi-IN",
                    "UNKNOWN",
                    Map.of(),
                    List.of(),
                    "कोई ऑडियो प्राप्त नहीं हुआ। कृपया दोबारा बोलें।",
                    "कोई ऑडियो प्राप्त नहीं हुआ। कृपया दोबारा बोलें।",
                    "ਕੋਈ ਆਡੀਓ ਨਹੀਂ ਮਿਲੀ।",
                    null,
                    "MandiSaathi Engine",
                    "",
                    "FAILED",
                    false,
                    "Audio payload is empty.",
                    List.of()
            ));
        }

        byte[] audioBytes = audioFile.getBytes();
        return ResponseEntity.ok(voiceAssistantService.processAudioQuery(audioBytes, language));
    }
}
