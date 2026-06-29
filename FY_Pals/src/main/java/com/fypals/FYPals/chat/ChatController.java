package com.fypals.FYPals.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;

    // ── WebSocket: receive, persist, broadcast ────────────────────────────────
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage message) {
        message.setTimestamp(LocalDateTime.now());

        ChatMessageEntity entity = new ChatMessageEntity();
        entity.setTeamId(message.getTeamId());
        entity.setSenderId(message.getSenderId());
        entity.setSenderName(message.getSenderName());
        entity.setContent(message.getContent());
        entity.setMessageType(message.getMessageType() != null ? message.getMessageType() : "TEXT");
        entity.setTimestamp(message.getTimestamp());
        chatMessageRepository.save(entity);

        messagingTemplate.convertAndSend(
                "/topic/team/" + message.getTeamId(),
                message
        );
    }

    // ── REST: GET /teams/{teamId}/chat/history?limit=50 ───────────────────────
    @GetMapping("/teams/{teamId}/chat/history")
    public ResponseEntity<?> getChatHistory(
            @PathVariable Long teamId,
            @RequestParam(defaultValue = "50") int limit) {

        List<ChatMessageEntity> entities;
        if (limit <= 100) {
            entities = chatMessageRepository.findByTeamIdOrderByTimestampAsc(teamId);
        } else {
            List<ChatMessageEntity> desc = chatMessageRepository
                    .findByTeamIdOrderByTimestampDesc(teamId, PageRequest.of(0, limit));
            entities = new ArrayList<>(desc);
            entities.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));
        }

        // Use HashMap instead of Map.of to avoid Java type inference issues
        List<Map<String, Object>> messages = new ArrayList<>();
        for (ChatMessageEntity e : entities) {
            Map<String, Object> m = new HashMap<>();
            m.put("teamId",      e.getTeamId());
            m.put("senderId",    e.getSenderId());
            m.put("senderName",  e.getSenderName());
            m.put("content",     e.getContent());
            m.put("messageType", e.getMessageType());
            m.put("timestamp",   e.getTimestamp().toString());
            messages.add(m);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data",    messages);
        response.put("message", "OK");

        return ResponseEntity.ok(response);
    }
}