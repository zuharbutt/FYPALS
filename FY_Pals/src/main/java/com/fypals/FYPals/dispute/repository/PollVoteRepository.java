package com.fypals.FYPals.dispute.repository;

import com.fypals.FYPals.dispute.entity.PollVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PollVoteRepository extends JpaRepository<PollVote, Long> {
    Optional<PollVote> findByPollIdAndVoterId(Long pollId, Long voterId);
    List<PollVote> findByPollId(Long pollId);
}