package com.mandisaathi.controller;

import com.mandisaathi.dto.VoiceQueryRequest;
import com.mandisaathi.dto.VoiceQueryResponse;
import com.mandisaathi.service.VoiceAssistantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
