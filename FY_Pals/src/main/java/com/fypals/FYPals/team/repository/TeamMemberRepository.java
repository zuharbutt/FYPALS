package com.fypals.FYPals.team.repository;

import com.fypals.FYPals.team.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    List<TeamMember> findByTeamId(Long teamId);
    List<TeamMember> findByUserId(Long userId);
    Optional<TeamMember> findByTeamIdAndUserId(Long teamId, Long userId);
    boolean existsByTeamIdAndUserIdAndDropDateIsNull(Long teamId, Long userId);
    int countByTeamId(Long teamId);

    @Modifying
    @Transactional
    void deleteByTeamId(Long teamId);

    @Modifying
    @Transactional
    void deleteByUserId(Long userId);
}