package com.fypals.FYPals.content.repository;

import com.fypals.FYPals.content.entity.Vote;
import com.fypals.FYPals.enums.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface VoteRepository extends JpaRepository<Vote, Long> {
    Optional<Vote> findByPostIdAndUserId(Long postId, Long userId);
    int countByPostIdAndVoteType(Long postId, VoteType voteType);
    void deleteByPostId(Long postId);
}