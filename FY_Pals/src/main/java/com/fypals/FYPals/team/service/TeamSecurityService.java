package com.fypals.FYPals.team.service;

import com.fypals.FYPals.team.repository.TeamMemberRepository;
import com.fypals.FYPals.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TeamSecurityService {

    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    /**
     * Returns true if the user (by email) is an active member of the team.
     * Use this in controllers to guard team-specific endpoints.
     */
    public boolean isTeamMember(String userEmail, Long teamId) {
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("User not found"))
                .getId();
        return teamMemberRepository.existsByTeamIdAndUserIdAndDropDateIsNull(teamId, userId);
    }

    public boolean isTeamLeader(String userEmail, Long teamId) {
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("User not found"))
                .getId();
        return teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .map(tm -> tm.getMemberRole().name().equals("LEADER"))
                .orElse(false);
    }
}