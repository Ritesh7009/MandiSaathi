package com.mandisaathi.client.gnani;

public class GnaniApiException extends RuntimeException {
    private final int statusCode;

    public GnaniApiException(String message) {
        super(message);
        this.statusCode = 500;
    }

    public GnaniApiException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() {
        return statusCode;
    }
}


