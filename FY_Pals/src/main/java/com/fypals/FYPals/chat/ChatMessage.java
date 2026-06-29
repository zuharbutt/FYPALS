package com.fypals.FYPals.chat;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * WebSocket transport POJO — used to receive and broadcast chat messages.
 * NOT a JPA entity. For DB persistence see ChatMessageEntity.java.
 */
@Data
public class ChatMessage {
    private Long teamId;
    private Long senderId;
    private String senderName;
    private String content;
    private String messageType; // TEXT, DISPUTE_REQUEST, POLL
    private LocalDateTime timestamp;
}