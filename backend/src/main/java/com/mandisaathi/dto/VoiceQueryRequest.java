package com.mandisaathi.dto;

import java.util.List;

public record VoiceQueryRequest(
        String queryText,
        String language
) {}

