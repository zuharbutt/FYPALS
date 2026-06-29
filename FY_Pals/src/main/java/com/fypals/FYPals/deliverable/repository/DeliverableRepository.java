package com.fypals.FYPals.deliverable.repository;

import com.fypals.FYPals.deliverable.entity.Deliverable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface DeliverableRepository extends JpaRepository<Deliverable, Long> {
    List<Deliverable> findByProjectId(Long projectId);
    List<Deliverable> findByDeadlineBetweenAndStatusNotAndReminderSentFalse(
            LocalDate start, LocalDate end, String status);
    List<Deliverable> findByDeadlineAndStatusNot(LocalDate deadline, String status);

    @Modifying
    @Transactional
    void deleteByProjectId(Long projectId);
}