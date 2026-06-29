package com.fypals.FYPals.dispute.repository;

import com.fypals.FYPals.dispute.entity.Poll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PollRepository extends JpaRepository<Poll, Long> {
    Optional<Poll> findByDisputeId(Long disputeId);
    List<Poll> findAllByDisputeId(Long disputeId);
}