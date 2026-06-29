package com.fypals.FYPals.deliverable.entity;

import com.fypals.FYPals.progress.entity.Project;
import com.fypals.FYPals.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "deliverables")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deliverable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    private String title;

    private LocalDate deadline;

    @Builder.Default
    private String status = "PENDING";

    private LocalDateTime submittedAt;

    private String googleDriveLink;

    @ManyToOne
    @JoinColumn(name = "submitted_by")
    private User submittedBy;

    @Builder.Default
    private boolean reminderSent = false;

    @Column(name = "resubmission_comment", length = 2000)
    private String resubmissionComment;
}