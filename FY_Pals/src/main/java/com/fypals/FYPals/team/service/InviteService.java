package com.fypals.FYPals.team.service;

import com.fypals.FYPals.enums.MemberRole;
import com.fypals.FYPals.enums.TeamStatus;
import com.fypals.FYPals.notification.entity.Notification;
import com.fypals.FYPals.notification.repository.NotificationRepository;
import com.fypals.FYPals.notification.service.NotificationService;
import com.fypals.FYPals.progress.repository.ProjectRepository;
import com.fypals.FYPals.team.entity.Team;
import com.fypals.FYPals.team.entity.TeamMember;
import com.fypals.FYPals.team.repository.TeamMemberRepository;
import com.fypals.FYPals.team.repository.TeamRepository;
import com.fypals.FYPals.user.entity.User;
import com.fypals.FYPals.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InviteService {

    private final NotificationRepository notificationRepository;
    private final TeamRepository         teamRepository;
    private final TeamMemberRepository   teamMemberRepository;
    private final UserRepository         userRepository;
    private final NotificationService    notificationService;
    private final ProjectRepository      projectRepository;
    private final TeamService            teamService;

    @Transactional
    public String acceptInvite(String userEmail, Long teamId, Long notificationId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        Notification notification = validateInviteNotification(user, notificationId, teamId);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));

        // Handle ADVISOR_INVITE separately
        if ("ADVISOR_INVITE".equals(notification.getType())) {
            return acceptAdvisorInvite(user, team, notification);
        }

        // TEAM_INVITE — student joining
        if (team.getStatus() == TeamStatus.LOCKED || team.getStatus() == TeamStatus.DISSOLVED) {
            throw new IllegalStateException("This team is no longer accepting new members");
        }

        boolean alreadyMember = teamMemberRepository
                .existsByTeamIdAndUserIdAndDropDateIsNull(teamId, user.getId());
        if (alreadyMember) {
            throw new IllegalStateException("You are already a member of this team");
        }

        boolean onAnotherTeam = teamMemberRepository.findByUserId(user.getId())
                .stream().anyMatch(tm -> tm.getDropDate() == null);
        if (onAnotherTeam) {
            throw new IllegalStateException("You are already on another team. Leave it first before joining a new team.");
        }

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .memberRole(MemberRole.MEMBER)
                .build();
        teamMemberRepository.save(member);

        notification.setRead(true);
        notificationRepository.save(notification);

        // Notify the team leader — use INVITE_ACCEPTED so no Accept/Decline buttons shown on leader side
        notificationService.sendNotification(
                team.getLeader().getId(),
                user.getName() + " accepted your invite to join " + team.getTeamName(),
                "INVITE_ACCEPTED",
                teamId
        );

        // Check if team can become ACTIVE now
        teamService.checkAndUpdateTeamStatus(teamId);

        return "You have joined " + team.getTeamName();
    }

    private String acceptAdvisorInvite(User advisor, Team team, Notification notification) {
        // Assign advisor as supervisor of this team's project
        projectRepository.findByTeamId(team.getId()).ifPresent(project -> {
            project.setSupervisorId(advisor.getId());
            projectRepository.save(project);
        });

        notification.setRead(true);
        notificationRepository.save(notification);

        // Notify the team leader — use INVITE_ACCEPTED so no Accept/Decline buttons shown on leader side
        notificationService.sendNotification(
                team.getLeader().getId(),
                advisor.getName() + " accepted your invitation to supervise team " + team.getTeamName(),
                "INVITE_ACCEPTED",
                team.getId()
        );

        // Check if team can become ACTIVE now
        teamService.checkAndUpdateTeamStatus(team.getId());

        return "You are now supervising team " + team.getTeamName();
    }

    @Transactional
    public String declineInvite(String userEmail, Long teamId, Long notificationId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        Notification notification = validateInviteNotification(user, notificationId, teamId);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));

        notification.setRead(true);
        notificationRepository.save(notification);

        // Notify the leader with INVITE_DECLINED — informational only, no action buttons
        String declineMsg = "ADVISOR_INVITE".equals(notification.getType())
                ? user.getName() + " declined your invitation to supervise team " + team.getTeamName()
                : user.getName() + " declined your invite to join " + team.getTeamName();
        notificationService.sendNotification(
                team.getLeader().getId(),
                declineMsg,
                "INVITE_DECLINED",
                teamId
        );

        return "Invite declined";
    }

    private Notification validateInviteNotification(User user, Long notificationId, Long teamId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found"));

        if (!notification.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("This notification doesn't belong to you");
        }

        if (!notification.getType().equals("TEAM_INVITE")
                && !notification.getType().equals("ADVISOR_INVITE")) {
            throw new IllegalStateException("This notification is not a team invite");
        }

        if (notification.getReferenceId() == null
                || !notification.getReferenceId().equals(teamId)) {
            throw new IllegalStateException("This invite does not match the given team");
        }

        if (notification.isRead()) {
            throw new IllegalStateException("This invite has already been handled");
        }

        return notification;
    }
}