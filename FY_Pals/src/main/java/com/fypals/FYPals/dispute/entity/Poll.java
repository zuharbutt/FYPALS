package com.fypals.FYPals.dispute.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "polls")
public class Poll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long disputeId;

    @Column(nullable = false, length = 500)
    private String question;

    @Column(nullable = false)
    private Long createdBy;

    private String options;  // JSON string or comma-separated: "Option1,Option2,Option3"

    private LocalDateTime deadline;

    private LocalDateTime createdAt;

    public Poll() {}

    public Poll(Long disputeId, String question, Long createdBy, String options, LocalDateTime deadline) {
        this.disputeId = disputeId;
        this.question = question;
        this.createdBy = createdBy;
        this.options = options;
        this.deadline = deadline;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDisputeId() { return disputeId; }
    public void setDisputeId(Long disputeId) { this.disputeId = disputeId; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public String getOptions() { return options; }
    public void setOptions(String options) { this.options = options; }

    public LocalDateTime getDeadline() { return deadline; }
    public void setDeadline(LocalDateTime deadline) { this.deadline = deadline; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}