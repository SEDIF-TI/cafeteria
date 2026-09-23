package com.sedif.sistema_cafeteria;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class SistemaCafeteriaApplication {

    public static void main(String[] args) {
        SpringApplication.run(SistemaCafeteriaApplication.class, args);
    }
}