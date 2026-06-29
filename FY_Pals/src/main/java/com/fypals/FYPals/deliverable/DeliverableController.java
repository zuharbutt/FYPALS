package com.fypals.FYPals.deliverable;

import com.fypals.FYPals.deliverable.entity.Deliverable;
import com.fypals.FYPals.deliverable.entity.Feedback;
import com.fypals.FYPals.deliverable.repository.DeliverableRepository;
import com.fypals.FYPals.deliverable.repository.FeedbackRepository;
import com.fypals.FYPals.deliverable.service.DeliverableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/deliverables")
@RequiredArgsConstructor
public class DeliverableController {

    private final DeliverableService deliverableService;
    private final DeliverableRepository deliverableRepository;
    private final FeedbackRepository feedbackRepository;

    @GetMapping
    @Transactional
    public ResponseEntity<List<Map<String, Object>>> listDeliverables() {
        return ResponseEntity.ok(
                deliverableRepository.findAll().stream()
                        .map(this::toMap)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/project/{projectId}")
    @Transactional
    public ResponseEntity<List<Map<String, Object>>> getByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(
                deliverableRepository.findByProjectId(projectId).stream()
                        .map(this::toMap)
                        .collect(Collectors.toList())
        );
    }

    @PostMapping("/project/{projectId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> create(
            @PathVariable Long projectId,
            @RequestBody Map<String, String> body) {
        Deliverable d = deliverableService.createDeliverable(projectId, body.get("title"), body.get("deadline"));
        return ResponseEntity.ok(toMap(d));
    }

    @PostMapping("/{id}/submit")
    @Transactional
    public ResponseEntity<Map<String, Object>> submit(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Deliverable d = deliverableService.submit(id, body.get("googleDriveLink"), body.get("resubmissionComment"));
        return ResponseEntity.ok(toMap(d));
    }

    @PostMapping("/{id}/feedback")
    @Transactional
    public ResponseEntity<Map<String, Object>> feedback(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Feedback fb = deliverableService.giveFeedback(
                id,
                body.get("comment"),
                body.get("decision"),
                body.get("callerRole"));
        Map<String, Object> result = new HashMap<>();
        result.put("id", fb.getId());
        result.put("comment", fb.getComment());
        result.put("decision", fb.getDecision());
        result.put("createdAt", fb.getCreatedAt());
        result.put("deliverableId", id);
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toMap(Deliverable d) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", d.getId());
        m.put("title", d.getTitle());
        m.put("deadline", d.getDeadline());
        m.put("status", d.getStatus());
        m.put("submittedAt", d.getSubmittedAt());
        m.put("googleDriveLink", d.getGoogleDriveLink());
        m.put("reminderSent", d.isReminderSent());
        m.put("projectId", d.getProject() != null ? d.getProject().getId() : null);
        m.put("submittedById", d.getSubmittedBy() != null ? d.getSubmittedBy().getId() : null);
        m.put("resubmissionComment", d.getResubmissionComment());

        // Return advisor feedback separately from staff comments
        List<Feedback> allFeedback = feedbackRepository.findByDeliverableId(d.getId());

        // Advisor feedback = has a decision (APPROVED / CHANGES_REQUESTED)
        // Use the MOST RECENT one (latest feedback after resubmission)
        allFeedback.stream()
                .filter(fb -> fb.getDecision() != null && !fb.getDecision().isBlank())
                .max(java.util.Comparator.comparing(fb -> fb.getCreatedAt()))
                .ifPresent(fb -> {
                    Map<String, Object> fbMap = new HashMap<>();
                    fbMap.put("id", fb.getId());
                    fbMap.put("comment", fb.getComment());
                    fbMap.put("decision", fb.getDecision());
                    fbMap.put("createdAt", fb.getCreatedAt());
                    m.put("feedback", fbMap);  // shown to students as advisor feedback
                });

        // Staff comments = no decision
        List<Map<String, Object>> staffComments = allFeedback.stream()
                .filter(fb -> fb.getDecision() == null || fb.getDecision().isBlank())
                .map(fb -> {
                    Map<String, Object> cm = new HashMap<>();
                    cm.put("id", fb.getId());
                    cm.put("comment", fb.getComment());
                    cm.put("createdAt", fb.getCreatedAt());
                    return cm;
                })
                .collect(java.util.stream.Collectors.toList());

        if (!staffComments.isEmpty()) {
            m.put("staffComments", staffComments);  // separate field for staff comments
        }

        return m;
    }
}