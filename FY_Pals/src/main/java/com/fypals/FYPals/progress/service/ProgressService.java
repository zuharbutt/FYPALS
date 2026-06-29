package com.fypals.FYPals.progress.service;

import com.fypals.FYPals.progress.entity.*;
import com.fypals.FYPals.progress.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private final ProjectRepository    projectRepository;
    private final PhaseRepository      phaseRepository;
    private final CheckpointRepository checkpointRepository;

    @Transactional
    public Phase addPhase(Long projectId, Phase phase) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Validate start < end
        if (phase.getStartDate() == null || phase.getEndDate() == null) {
            throw new IllegalArgumentException("Start date and end date are required");
        }
        if (!phase.getStartDate().isBefore(phase.getEndDate())) {
            throw new IllegalArgumentException("Phase start date must be before end date");
        }

        // Validate no overlapping dates with existing phases
        List<Phase> existing = phaseRepository.findByProjectId(projectId);
        for (Phase p : existing) {
            boolean overlaps = !phase.getEndDate().isBefore(p.getStartDate())
                    && !phase.getStartDate().isAfter(p.getEndDate());
            if (overlaps) {
                throw new RuntimeException("Dates overlap with existing phase: " + p.getName());
            }
        }

        phase.setProject(project);
        return phaseRepository.save(phase);
    }

    @Transactional
    public Checkpoint updateCheckpointStatus(Long checkpointId, String newStatus, String callerRole, Long callerId) {
        Checkpoint cp = checkpointRepository.findById(checkpointId)
                .orElseThrow(() -> new RuntimeException("Checkpoint not found"));

        // Only leader can mark COMPLETE
        if ("COMPLETE".equals(newStatus) && !"LEADER".equals(callerRole)) {
            throw new RuntimeException("Only the team leader can mark a checkpoint as complete");
        }

        // Once COMPLETE, only leader can change it back
        if ("COMPLETE".equals(cp.getStatus()) && !"LEADER".equals(callerRole)) {
            throw new RuntimeException("Only the team leader can change a completed checkpoint");
        }

        // Members can only set IN_PROGRESS or IN_REVIEW
        if ("MEMBER".equals(callerRole)) {
            if (!"IN_PROGRESS".equals(newStatus) && !"IN_REVIEW".equals(newStatus)) {
                throw new RuntimeException("Team members can only set status to IN_PROGRESS or IN_REVIEW");
            }
        }
        // Students can only update checkpoints assigned to them or unassigned
        if ("MEMBER".equals(callerRole)) {
            Long assignedToId = cp.getAssignedTo() != null ? cp.getAssignedTo().getId() : null;
            if (assignedToId != null && !assignedToId.equals(callerId)) {
                throw new RuntimeException("You can only update checkpoints assigned to you or unassigned ones");
            }
        }

        cp.setStatus(newStatus);
        checkpointRepository.save(cp);
        recalculateProjectCompletion(cp.getPhase().getProject().getId());
        return cp;
    }

    public void recalculateProjectCompletion(Long projectId) {
        List<Phase> phases = phaseRepository.findByProjectId(projectId);
        long total = 0, completed = 0;
        for (Phase p : phases) {
            List<Checkpoint> cps = checkpointRepository.findByPhaseId(p.getId());
            total     += cps.size();
            completed += cps.stream().filter(c -> "COMPLETE".equals(c.getStatus())).count();
        }
        double pct = total == 0 ? 0 : (completed * 100.0 / total);
        Project project = projectRepository.findById(projectId).get();
        project.setCompletionPercentage(pct);
        projectRepository.save(project);
    }
}