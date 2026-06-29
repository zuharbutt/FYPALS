package com.fypals.FYPals.notification.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String message;
    private String type;        // String instead of enum
    private boolean read;
    private Long referenceId;
    private LocalDateTime createdAt;
}