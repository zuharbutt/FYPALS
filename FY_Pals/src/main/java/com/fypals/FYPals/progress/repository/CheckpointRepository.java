package com.fypals.FYPals.progress.repository;

import com.fypals.FYPals.progress.entity.Checkpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CheckpointRepository extends JpaRepository<Checkpoint, Long> {
    List<Checkpoint> findByPhaseId(Long phaseId);
    List<Checkpoint> findByAssignedToId(Long userId);
}