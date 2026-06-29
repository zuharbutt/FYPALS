package com.fypals.FYPals.team.service;

import com.fypals.FYPals.enums.MemberRole;
import com.fypals.FYPals.enums.Role;
import com.fypals.FYPals.enums.TeamStatus;
import com.fypals.FYPals.notification.entity.Notification;
import com.fypals.FYPals.notification.repository.NotificationRepository;
import com.fypals.FYPals.notification.service.NotificationService;
import com.fypals.FYPals.progress.entity.Project;
import com.fypals.FYPals.progress.repository.ProjectRepository;
import com.fypals.FYPals.team.entity.Team;
import com.fypals.FYPals.team.entity.TeamMember;
import com.fypals.FYPals.team.repository.TeamMemberRepository;
import com.fypals.FYPals.team.repository.TeamRepository;
import com.fypals.FYPals.user.entity.User;
import com.fypals.FYPals.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final ProjectRepository    projectRepository;
    private final TeamRepository       teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository       userRepository;
    private final NotificationService  notificationService;

    @Transactional
    public Team formTeam(Long userId, String teamName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        boolean alreadyInTeam = teamMemberRepository.findByUserId(userId)
                .stream().anyMatch(tm -> tm.getDropDate() == null);
        if (alreadyInTeam) {
            throw new RuntimeException("User is already in a team");
        }

        if (teamName == null || teamName.trim().isEmpty()) {
            throw new IllegalArgumentException("Team name cannot be empty");
        }
        if (teamRepository.existsByTeamName(teamName.trim())) {
            throw new RuntimeException("A team with this name already exists");
        }

        Team team = Team.builder()
                .teamName(teamName.trim())
                .leader(user)
                .status(TeamStatus.FORMING)
                .build();
        team = teamRepository.save(team);

        TeamMember leaderMember = TeamMember.builder()
                .team(team)
                .user(user)
                .memberRole(MemberRole.LEADER)
                .build();
        teamMemberRepository.save(leaderMember);

        Project project = Project.builder()
                .team(team)
                .description("FYP Project for " + teamName)
                .status("ACTIVE")
                .startDate(java.time.LocalDate.now())
                .build();
        projectRepository.save(project);

        return team;
    }

    /**
     * Invite a student to join the team.
     * FIX: Only sends notification to the target student, NOT to the leader (who is sending it).
     * FIX: Validates the target user is actually a STUDENT role.
     */
    @Transactional
    public Notification inviteStudent(Long leaderId, Long teamId, Long targetUserId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        if (!team.getLeader().getId().equals(leaderId)) {
            throw new RuntimeException("Only team leader can send invites");
        }

        // Prevent leader from inviting themselves
        if (leaderId.equals(targetUserId)) {
            throw new RuntimeException("You cannot invite yourself");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Only students can be invited as team members
        if (targetUser.getRole() != Role.STUDENT) {
            throw new RuntimeException("Only students can be invited as team members");
        }

        boolean alreadyInTeam = teamMemberRepository.findByUserId(targetUserId)
                .stream().anyMatch(tm -> tm.getDropDate() == null);
        if (alreadyInTeam) {
            throw new RuntimeException("This student is already in a team");
        }

        // Send notification ONLY to the target student
        return notificationService.sendNotification(
                targetUserId,
                "You've been invited to join team: " + team.getTeamName() + " by " + team.getLeader().getName(),
                "TEAM_INVITE",
                teamId
        );
    }

    /**
     * Invite an advisor to supervise the team.
     * NEW: Dedicated advisor invite that sends ADVISOR_INVITE notification.
     */
    @Transactional
    public Notification inviteAdvisor(Long leaderId, Long teamId, Long advisorUserId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        if (!team.getLeader().getId().equals(leaderId)) {
            throw new RuntimeException("Only team leader can invite an advisor");
        }

        User advisor = userRepository.findById(advisorUserId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (advisor.getRole() != Role.ADVISOR) {
            throw new RuntimeException("The selected user is not an advisor");
        }

        // Check if team already has a supervisor
        projectRepository.findByTeamId(teamId).ifPresent(p -> {
            if (p.getSupervisorId() != null) {
                throw new RuntimeException("This team already has a supervisor");
            }
        });

        // Send notification to the advisor
        return notificationService.sendNotification(
                advisorUserId,
                "Team '" + team.getTeamName() + "' has invited you to be their FYP supervisor",
                "ADVISOR_INVITE",
                teamId
        );
    }

    @Transactional
    public Map<String, Object> getTeam(Long teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        Map<String, Object> result = new HashMap<>();
        result.put("id", team.getId());
        result.put("teamName", team.getTeamName());
        result.put("status", team.getStatus());
        result.put("leaderId", team.getLeader().getId());
        result.put("leaderName", team.getLeader().getName());
        result.put("memberCount", team.getMembers().size());
        result.put("createdAt", team.getCreatedAt());

        List<Map<String, Object>> members = team.getMembers().stream()
                .map(m -> {
                    Map<String, Object> member = new HashMap<>();
                    member.put("id", m.getId());
                    member.put("userId", m.getUser().getId());
                    member.put("userName", m.getUser().getName());
                    member.put("memberRole", m.getMemberRole());
                    return member;
                }).collect(Collectors.toList());
        result.put("members", members);

        projectRepository.findByTeamId(teamId).ifPresent(p -> {
            Map<String, Object> projectMap = new HashMap<>();
            projectMap.put("id", p.getId());
            projectMap.put("supervisorId", p.getSupervisorId());
            result.put("project", projectMap);
        });

        return result;
    }

    @Transactional
    public void dropMember(Long leaderId, Long teamId, Long memberId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        if (!team.getLeader().getId().equals(leaderId)) {
            throw new RuntimeException("Only team leader can drop members");
        }
        if (leaderId.equals(memberId)) {
            throw new RuntimeException("Leader cannot drop themselves");
        }

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, memberId)
                .orElseThrow(() -> new RuntimeException("Member not found in this team"));

        teamMemberRepository.delete(member);

        notificationService.sendNotification(
                memberId,
                "You have been removed from team: " + team.getTeamName(),
                "TEAM_DROPPED",
                teamId
        );
    }

    // ── Leave team (member) ──────────────────────────────────────────────────────
    @Transactional
    public void leaveTeam(Long userId, Long teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        boolean isLeader = team.getLeader().getId().equals(userId);

        if (isLeader) {
            // Count active members (excluding dropped)
            long activeMemberCount = teamMemberRepository.findByTeamId(teamId)
                    .stream()
                    .filter(m -> m.getDropDate() == null)
                    .count();

            if (activeMemberCount > 1) {
                throw new RuntimeException("Leader must transfer leadership before leaving when other members exist");
            }
            // Only member — allowed to leave (disbands the team effectively)
        }

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this team"));

        teamMemberRepository.delete(member);

        if (!isLeader) {
            notificationService.sendNotification(
                    team.getLeader().getId(),
                    "A member has left your team: " + team.getTeamName(),
                    "TEAM_DROPPED",
                    teamId
            );
        }
    }

    // ── Transfer leadership then leave ────────────────────────────────────────
    @Transactional
    public void transferLeadershipAndLeave(Long currentLeaderId, Long teamId, Long newLeaderId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        if (!team.getLeader().getId().equals(currentLeaderId)) {
            throw new RuntimeException("Only the current leader can transfer leadership");
        }
        if (currentLeaderId.equals(newLeaderId)) {
            throw new RuntimeException("Cannot transfer leadership to yourself");
        }

        // Verify new leader is an active member
        TeamMember newLeaderMember = teamMemberRepository.findByTeamIdAndUserId(teamId, newLeaderId)
                .orElseThrow(() -> new RuntimeException("Selected member is not in this team"));

        // Find the new leader's User
        User newLeader = newLeaderMember.getUser();

        // Update team leader
        team.setLeader(newLeader);
        teamRepository.save(team);

        // Update member roles
        newLeaderMember.setMemberRole(com.fypals.FYPals.enums.MemberRole.LEADER);
        teamMemberRepository.save(newLeaderMember);

        // Remove old leader from members
        teamMemberRepository.findByTeamIdAndUserId(teamId, currentLeaderId)
                .ifPresent(teamMemberRepository::delete);

        // Notify new leader
        notificationService.sendNotification(
                newLeaderId,
                "You are now the leader of team: " + team.getTeamName(),
                "TEAM_INVITE",
                teamId
        );
    }

    /**
     * Check and update team status.
     * Team becomes ACTIVE when it has: 1 leader + at least 1 other member + an advisor (supervisorId set).
     * Called after a member accepts an invite.
     */
    @Transactional
    public void checkAndUpdateTeamStatus(Long teamId) {
        Team team = teamRepository.findById(teamId).orElse(null);
        if (team == null || team.getStatus() != TeamStatus.FORMING) return;

        int memberCount = teamMemberRepository.countByTeamId(teamId);
        // Need at least 2 members (leader + 1 more)
        if (memberCount < 2) return;

        // Check if advisor assigned
        projectRepository.findByTeamId(teamId).ifPresent(p -> {
            if (p.getSupervisorId() != null) {
                team.setStatus(TeamStatus.ACTIVE);
                teamRepository.save(team);
            }
        });
    }
}