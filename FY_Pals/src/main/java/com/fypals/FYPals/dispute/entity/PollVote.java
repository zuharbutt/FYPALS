package com.fypals.FYPals.dispute.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "poll_votes", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"poll_id", "voter_id"})
})
public class PollVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "poll_id", nullable = false)
    private Long pollId;

    @Column(name = "voter_id", nullable = false)
    private Long voterId;

    @Column(nullable = false)
    private String chosenOption;

    private LocalDateTime votedAt;

    public PollVote() {}

    public PollVote(Long pollId, Long voterId, String chosenOption) {
        this.pollId = pollId;
        this.voterId = voterId;
        this.chosenOption = chosenOption;
        this.votedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPollId() { return pollId; }
    public void setPollId(Long pollId) { this.pollId = pollId; }

    public Long getVoterId() { return voterId; }
    public void setVoterId(Long voterId) { this.voterId = voterId; }

    public String getChosenOption() { return chosenOption; }
    public void setChosenOption(String chosenOption) { this.chosenOption = chosenOption; }

    public LocalDateTime getVotedAt() { return votedAt; }
    public void setVotedAt(LocalDateTime votedAt) { this.votedAt = votedAt; }

    @PrePersist
    protected void onVote() {
        votedAt = LocalDateTime.now();
    }
}