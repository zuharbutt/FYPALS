package com.fypals.FYPals.deliverable.service;

import com.fypals.FYPals.deliverable.entity.Deliverable;
import com.fypals.FYPals.deliverable.entity.Feedback;
import com.fypals.FYPals.deliverable.repository.DeliverableRepository;
import com.fypals.FYPals.deliverable.repository.FeedbackRepository;
import com.fypals.FYPals.notification.service.NotificationService;
import com.fypals.FYPals.progress.entity.Phase;
import com.fypals.FYPals.progress.entity.Project;
import com.fypals.FYPals.progress.repository.CheckpointRepository;
import com.fypals.FYPals.progress.repository.PhaseRepository;
import com.fypals.FYPals.progress.repository.ProjectRepository;
import com.fypals.FYPals.progress.service.ProgressService;
import com.fypals.FYPals.team.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeliverableService {

    private final DeliverableRepository  deliverableRepository;
    private final FeedbackRepository     feedbackRepository;
    private final ProjectRepository      projectRepository;
    private final NotificationService    notificationService;
    private final TeamMemberRepository   teamMemberRepository;
    private final PhaseRepository        phaseRepository;
    private final CheckpointRepository   checkpointRepository;
    private final ProgressService        progressService;

    public Deliverable createDeliverable(Long projectId, String title, String deadline) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Deliverable title cannot be empty");
        }
        if (deadline == null || deadline.trim().isEmpty()) {
            throw new IllegalArgumentException("Deadline is required");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        LocalDate deadlineDate = LocalDate.parse(deadline);
        if (deadlineDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Deadline cannot be in the past");
        }

        // New deadline must be after all existing deliverables' deadlines
        deliverableRepository.findByProjectId(projectId).stream()
                .map(Deliverable::getDeadline)
                .filter(d -> d != null)
                .max(java.util.Comparator.naturalOrder())
                .ifPresent(latestDeadline -> {
                    if (!deadlineDate.isAfter(latestDeadline)) {
                        throw new IllegalArgumentException(
                                "New deliverable deadline must be after the latest existing deadline (" + latestDeadline + ")");
                    }
                });

        Deliverable d = new Deliverable();
        d.setProject(project);
        d.setTitle(title.trim());
        d.setDeadline(deadlineDate);
        d.setStatus("PENDING");
        return deliverableRepository.save(d);
    }

    /**
     * Submit or RESUBMIT a deliverable.
     */
    public Deliverable submit(Long deliverableId, String driveLink, String resubmissionComment) {
        if (driveLink == null || driveLink.trim().isEmpty()) {
            throw new IllegalArgumentException("Google Drive link cannot be empty");
        }

        Deliverable d = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + deliverableId));

        if (!"PENDING".equals(d.getStatus()) && !"CHANGES_REQUESTED".equals(d.getStatus())) {
            throw new RuntimeException("This deliverable cannot be submitted. Current status: " + d.getStatus());
        }

        if (d.getDeadline() != null && LocalDate.now().isAfter(d.getDeadline())) {
            throw new RuntimeException("Submission deadline has passed. Deadline was: " + d.getDeadline());
        }

        d.setGoogleDriveLink(driveLink.trim());
        d.setStatus("SUBMITTED");
        d.setSubmittedAt(LocalDateTime.now());
        if (resubmissionComment != null && !resubmissionComment.isBlank()) {
            d.setResubmissionComment(resubmissionComment.trim());
        } else {
            d.setResubmissionComment(null);
        }
        Deliverable saved = deliverableRepository.save(d);

        if (d.getProject() != null && d.getProject().getSupervisorId() != null) {
            notificationService.sendNotification(
                    d.getProject().getSupervisorId(),
                    "Team submitted deliverable: '" + d.getTitle() + "'",
                    "DELIVERABLE_SUBMITTED",
                    deliverableId
            );
        }

        return saved;
    }

    /**
     * Give feedback on a deliverable.
     * ADVISOR: must provide a decision (APPROVED or CHANGES_REQUESTED).
     *   When APPROVED: automatically marks all checkpoints belonging to this
     *   deliverable's phases as COMPLETE and recalculates project completion.
     * FYP_STAFF: leaves a comment only - no decision, no status change.
     */
    public Feedback giveFeedback(Long deliverableId, String comment,
                                 String decision, String callerRole) {
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Feedback comment cannot be empty");
        }

        Deliverable d = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found"));

        Feedback fb = new Feedback();
        fb.setDeliverable(d);
        fb.setComment(comment.trim());

        if ("ADVISOR".equals(callerRole)) {
            if (decision == null || decision.isBlank()) {
                throw new RuntimeException("Advisor must provide a decision: APPROVED or CHANGES_REQUESTED");
            }
            if (!decision.equals("APPROVED") && !decision.equals("CHANGES_REQUESTED")) {
                throw new IllegalArgumentException("Decision must be APPROVED or CHANGES_REQUESTED");
            }
            fb.setDecision(decision);
            d.setStatus(decision);
            deliverableRepository.save(d);

            if ("APPROVED".equals(decision) && d.getProject() != null) {
                Long projectId = d.getProject().getId();

                List<Deliverable> allDeliverables = deliverableRepository
                        .findByProjectId(projectId)
                        .stream()
                        .filter(del -> del.getDeadline() != null)
                        .sorted(java.util.Comparator.comparing(Deliverable::getDeadline))
                        .collect(Collectors.toList());

                LocalDate lowerBound = null;
                for (Deliverable del : allDeliverables) {
                    if (del.getId().equals(d.getId())) break;
                    lowerBound = del.getDeadline();
                }
                final LocalDate startBound = lowerBound;

                List<Phase> phases = phaseRepository.findByProjectId(projectId);
                for (Phase phase : phases) {
                    boolean belongs =
                            phase.getEndDate() != null
                                    && !phase.getEndDate().isAfter(d.getDeadline())
                                    && (startBound == null || phase.getEndDate().isAfter(startBound));
                    if (belongs) {
                        checkpointRepository.findByPhaseId(phase.getId()).forEach(cp -> {
                            if (!"COMPLETE".equals(cp.getStatus())) {
                                cp.setStatus("COMPLETE");
                                checkpointRepository.save(cp);
                            }
                        });
                    }
                }

                progressService.recalculateProjectCompletion(projectId);
            }
        }

        Feedback saved = feedbackRepository.save(fb);

        if (d.getProject() != null && d.getProject().getTeam() != null) {
            Long teamId = d.getProject().getTeam().getId();
            String msg = "ADVISOR".equals(callerRole)
                    ? "Your deliverable '" + d.getTitle() + "' received feedback: " + decision
                    : "FYP Staff left a comment on deliverable '" + d.getTitle() + "'";

            teamMemberRepository.findByTeamId(teamId).forEach(member ->
                    notificationService.sendNotification(
                            member.getUser().getId(),
                            msg,
                            "DELIVERABLE_FEEDBACK",
                            deliverableId
                    )
            );
        }

        return saved;
    }
}