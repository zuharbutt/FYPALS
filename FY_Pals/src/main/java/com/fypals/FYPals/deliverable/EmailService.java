package com.fypals.FYPals.deliverable;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    /**
     * Sends an email. In production this uses JavaMailSender.
     * For testing, logs the email details instead.
     */
    public void sendEmail(String to, String subject, String body) {
        log.info("EMAIL TO: {} | SUBJECT: {} | BODY: {}", to, subject, body);
        // TODO: Replace with actual JavaMailSender in production
        // mailSender.send(buildMessage(to, subject, body));
    }
}