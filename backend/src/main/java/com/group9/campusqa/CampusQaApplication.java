package com.group9.campusqa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;


@EnableAsync
@SpringBootApplication
public class CampusQaApplication {


    public static void main(String[] args) {

        SpringApplication.run(
            CampusQaApplication.class,
            args
        );

    }
}