package com.fypals.FYPals.deliverable.repository;

import com.fypals.FYPals.deliverable.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByDeliverableId(Long deliverableId);
    Optional<Feedback> findFirstByDeliverableIdOrderByCreatedAtDesc(Long deliverableId);
}