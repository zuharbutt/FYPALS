package com.fypals.FYPals.dispute.entity;

import com.fypals.FYPals.enums.DisputeStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "disputes")
public class Dispute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long teamId;

    @Column(nullable = false)
    private Long raisedBy;

    @Transient
    private String raisedByName;

    @Transient
    private String resolvedByName;

    @Column(nullable = false, length = 500)
    private String targetItem;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    private DisputeStatus status;

    private String rejectionReason;

    private String winningOption;

    private Long resolvedByDispute;

    private LocalDateTime createdAt;

    private LocalDateTime resolvedAt;

    public Dispute() {}

    public Dispute(Long teamId, Long raisedBy, String targetItem, String reason) {
        this.teamId = teamId;
        this.raisedBy = raisedBy;
        this.targetItem = targetItem;
        this.reason = reason;
        this.status = DisputeStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }

    public Long getRaisedBy() { return raisedBy; }
    public void setRaisedBy(Long raisedBy) { this.raisedBy = raisedBy; }

    public String getRaisedByName() { return raisedByName; }
    public void setRaisedByName(String raisedByName) { this.raisedByName = raisedByName; }

    public String getResolvedByName() { return resolvedByName; }
    public void setResolvedByName(String resolvedByName) { this.resolvedByName = resolvedByName; }

    public String getTargetItem() { return targetItem; }
    public void setTargetItem(String targetItem) { this.targetItem = targetItem; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public DisputeStatus getStatus() { return status; }
    public void setStatus(DisputeStatus status) { this.status = status; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getWinningOption() { return winningOption; }
    public void setWinningOption(String winningOption) { this.winningOption = winningOption; }

    public Long getResolvedByDispute() { return resolvedByDispute; }
    public void setResolvedByDispute(Long resolvedByDispute) { this.resolvedByDispute = resolvedByDispute; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}