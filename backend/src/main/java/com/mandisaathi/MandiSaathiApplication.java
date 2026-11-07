package com.mandisaathi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MandiSaathiApplication {

    public static void main(String[] args) {
        SpringApplication.run(MandiSaathiApplication.class, args);
    }
}

