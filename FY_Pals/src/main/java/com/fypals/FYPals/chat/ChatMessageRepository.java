package com.fypals.FYPals.chat;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {

    // Returns messages for a team ordered oldest-first (for rendering top-to-bottom)
    List<ChatMessageEntity> findByTeamIdOrderByTimestampAsc(Long teamId);

    // Paginated version — newest N messages (use for large histories)
    List<ChatMessageEntity> findByTeamIdOrderByTimestampDesc(Long teamId, Pageable pageable);
}