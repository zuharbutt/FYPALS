package com.fypals.FYPals.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;        // simple Long — no FK join needed

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false)
    private String type;        // plain String instead of enum

    @Column(name = "is_read")
    private boolean read = false;

    @Column(name = "reference_id")
    private Long referenceId;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}