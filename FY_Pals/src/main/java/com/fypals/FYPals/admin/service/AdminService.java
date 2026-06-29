package com.fypals.FYPals.admin.service;

import com.fypals.FYPals.admin.dto.AdminPostDTO;
import com.fypals.FYPals.admin.dto.AdminTeamDTO;
import com.fypals.FYPals.admin.dto.AdminUserDTO;
import com.fypals.FYPals.content.entity.Post;
import com.fypals.FYPals.content.repository.CommentRepository;
import com.fypals.FYPals.content.repository.PostRepository;
import com.fypals.FYPals.content.repository.VoteRepository;
import com.fypals.FYPals.deliverable.repository.DeliverableRepository;
import com.fypals.FYPals.deliverable.repository.FeedbackRepository;
import com.fypals.FYPals.dispute.repository.DisputeRepository;
import com.fypals.FYPals.enums.Role;
import com.fypals.FYPals.enums.VoteType;
import com.fypals.FYPals.notification.repository.NotificationRepository;
import com.fypals.FYPals.progress.repository.CheckpointRepository;
import com.fypals.FYPals.progress.repository.PhaseRepository;
import com.fypals.FYPals.progress.repository.ProjectRepository;
import com.fypals.FYPals.team.entity.Team;
import com.fypals.FYPals.team.entity.TeamMember;
import com.fypals.FYPals.team.repository.TeamMemberRepository;
import com.fypals.FYPals.team.repository.TeamRepository;
import com.fypals.FYPals.user.entity.*;
import com.fypals.FYPals.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository       userRepository;
    private final TeamRepository       teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final PostRepository       postRepository;
    private final CommentRepository    commentRepository;
    private final VoteRepository       voteRepository;
    private final NotificationRepository notificationRepository;
    private final ProjectRepository    projectRepository;
    private final PhaseRepository      phaseRepository;
    private final CheckpointRepository checkpointRepository;
    private final DeliverableRepository deliverableRepository;
    private final FeedbackRepository    feedbackRepository;
    private final DisputeRepository    disputeRepository;
    private final PasswordEncoder      passwordEncoder;
    private final JavaMailSender       mailSender;

    // ── Read ──────────────────────────────────────────────────────────────────

    public Page<AdminUserDTO> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toAdminUserDTO);
    }

    public AdminUserDTO getUserById(Long id) {
        return toAdminUserDTO(userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id)));
    }

    @Transactional
    public Page<AdminTeamDTO> getAllTeams(Pageable pageable) {
        return teamRepository.findAll(pageable).map(this::toAdminTeamDTO);
    }

    public Page<AdminPostDTO> getAllPosts(Pageable pageable) {
        return postRepository.findAll(pageable).map(this::toAdminPostDTO);
    }

    // ── Create user ───────────────────────────────────────────────────────────

    @Transactional
    public void createUser(String name, String email, String password, String roleStr) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already in use");
        }
        Role role = Role.valueOf(roleStr);
        String hashed = passwordEncoder.encode(password);

        User user = switch (role) {
            case STUDENT   -> new Student();
            case ADVISOR   -> new Advisor();
            case FYP_STAFF -> new FYPStaff();
            case ADMIN     -> new Admin();
        };

        user.setRole(role);
        user.setName(name);
        user.setEmail(email);
        user.setPassword(hashed);

        // Admins are always profile-complete; others must fill their profiles
        user.setProfileComplete(role == Role.ADMIN);

        userRepository.save(user);
    }

    // ── Change password ───────────────────────────────────────────────────────

    @Transactional
    public void changePassword(Long id, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        // Stamp roleChangedAt to invalidate existing JWT tokens for this user
        user.setRoleChangedAt(java.time.LocalDateTime.now());
        userRepository.save(user);
    }

    // ── Update role ───────────────────────────────────────────────────────────

    @Transactional
    public void updateUserRole(Long id, String roleStr) {
        User oldUser = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));

        Role newRole = Role.valueOf(roleStr);
        if (oldUser.getRole() == newRole) return;

        userRepository.updateDtype(id, newRole.name());
        oldUser.setRole(newRole);
        // If changing TO admin, mark profile complete automatically
        if (newRole == Role.ADMIN) {
            oldUser.setProfileComplete(true);
        }
        // Stamp roleChangedAt so any existing JWT issued before this is rejected
        oldUser.setRoleChangedAt(java.time.LocalDateTime.now());
        userRepository.save(oldUser);
    }

    // ── Delete user ───────────────────────────────────────────────────────────

    @Transactional
    public void deleteUser(Long id, Long requestingAdminId) {
        if (id.equals(requestingAdminId)) {
            throw new RuntimeException("You cannot delete your own account");
        }
        if (!userRepository.existsById(id)) {
            throw new EntityNotFoundException("User not found: " + id);
        }

        List<Team> ledTeams = teamRepository.findByLeaderId(id);
        for (Team team : ledTeams) {
            // Find another active member to transfer leadership to
            List<TeamMember> otherMembers = teamMemberRepository.findByTeamId(team.getId())
                    .stream()
                    .filter(m -> m.getDropDate() == null && !m.getUser().getId().equals(id))
                    .collect(java.util.stream.Collectors.toList());

            if (otherMembers.isEmpty()) {
                // No other members — delete the team
                deleteTeamInternal(team.getId());
            } else {
                // Transfer leadership to the first available member
                User newLeader = otherMembers.get(0).getUser();
                team.setLeader(newLeader);
                teamRepository.save(team);
            }
        }

        List<TeamMember> memberships = teamMemberRepository.findByUserId(id);
        teamMemberRepository.deleteAll(memberships);

        // Clear supervisorId on any projects this user supervised (Bug 5)
        projectRepository.findBySupervisorId(id).forEach(project -> {
            project.setSupervisorId(null);
            projectRepository.save(project);
        });
        // Null out checkpoint assignments for this user before deleting
        checkpointRepository.findByAssignedToId(id).forEach(cp -> {
            cp.setAssignedTo(null);
            checkpointRepository.save(cp);
        });


        List<Post> userPosts = postRepository.findByAuthorId(id);
        for (Post post : userPosts) {
            voteRepository.deleteByPostId(post.getId());
            commentRepository.deleteByPostId(post.getId());
        }
        postRepository.deleteAll(userPosts);

        notificationRepository.deleteByUserId(id);
        userRepository.deleteById(id);
    }

    // ── Delete team ───────────────────────────────────────────────────────────

    @Transactional
    public void deleteTeam(Long teamId) {
        if (!teamRepository.existsById(teamId)) {
            throw new EntityNotFoundException("Team not found: " + teamId);
        }
        deleteTeamInternal(teamId);
    }

    private void deleteTeamInternal(Long teamId) {
        disputeRepository.deleteByTeamId(teamId);
        projectRepository.findByTeamId(teamId).ifPresent(project -> {
            // Delete checkpoints → phases → deliverables → project (FK order)
            List<com.fypals.FYPals.progress.entity.Phase> phases =
                    phaseRepository.findByProjectId(project.getId());
            for (com.fypals.FYPals.progress.entity.Phase phase : phases) {
                checkpointRepository.deleteAll(
                        checkpointRepository.findByPhaseId(phase.getId()));
            }
            phaseRepository.deleteAll(phases);
            // Delete feedback for each deliverable before deleting deliverables (FK constraint)
            deliverableRepository.findByProjectId(project.getId()).forEach(d ->
                    feedbackRepository.deleteAll(feedbackRepository.findByDeliverableId(d.getId()))
            );
            deliverableRepository.deleteByProjectId(project.getId());
            projectRepository.delete(project);
        });
        teamMemberRepository.deleteByTeamId(teamId);
        teamRepository.deleteById(teamId);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private AdminUserDTO toAdminUserDTO(User user) {
        return AdminUserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .profileComplete(user.isProfileComplete())
                .skills(user.getSkills())
                .bio(user.getBio())
                .createdAt(user.getCreatedAt())
                .build();
    }

    // ── Delete post ──────────────────────────────────────────────────────────

    @Transactional
    public void deletePost(Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new EntityNotFoundException("Post not found: " + postId);
        }
        voteRepository.deleteByPostId(postId);
        commentRepository.deleteByPostId(postId);
        postRepository.deleteById(postId);
    }

    // ── Team detail (full members list) ──────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getTeamDetail(Long teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));

        List<Map<String, Object>> members = team.getMembers().stream()
                .filter(m -> m.getDropDate() == null)
                .map(m -> {
                    Map<String, Object> memberMap = new java.util.LinkedHashMap<>();
                    memberMap.put("userId",     m.getUser().getId());
                    memberMap.put("userName",   m.getUser().getName());
                    memberMap.put("email",      m.getUser().getEmail());
                    memberMap.put("role",       m.getUser().getRole());
                    memberMap.put("memberRole", m.getMemberRole());
                    return memberMap;
                }).collect(Collectors.toList());

        String advisorName = projectRepository.findByTeamId(teamId)
                .map(proj -> proj.getSupervisorId())
                .filter(sid -> sid != null)
                .flatMap(sid -> userRepository.findById(sid))
                .map(User::getName).orElse(null);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id",          team.getId());
        result.put("teamName",    team.getTeamName());
        result.put("status",      team.getStatus());
        result.put("leaderId",    team.getLeader().getId());
        result.put("leaderName",  team.getLeader().getName());
        result.put("advisorName", advisorName);
        result.put("createdAt",   team.getCreatedAt());
        result.put("members",     members);
        return result;
    }

    // ── Add member to team ────────────────────────────────────────────────────

    @Transactional
    public void addMemberToTeam(Long teamId, Long userId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        // Check not already an active member of THIS team
        boolean alreadyMember = team.getMembers().stream()
                .anyMatch(m -> m.getUser().getId().equals(userId) && m.getDropDate() == null);
        if (alreadyMember) throw new RuntimeException("User is already a member of this team");

        // Block if user is already an active member of ANY other team (Bug 8)
        boolean inAnotherTeam = teamMemberRepository.findByUserId(userId).stream()
                .anyMatch(m -> m.getDropDate() == null && !m.getTeam().getId().equals(teamId));
        if (inAnotherTeam) throw new RuntimeException(
                "User is already a member of another team. Remove them first.");

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .memberRole(com.fypals.FYPals.enums.MemberRole.MEMBER)
                .build();
        teamMemberRepository.save(member);
    }

    // ── Remove member from team ───────────────────────────────────────────────

    @Transactional
    public void removeMemberFromTeam(Long teamId, Long userId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));

        if (team.getLeader().getId().equals(userId)) {
            throw new RuntimeException("Cannot remove the team leader. Transfer leadership first.");
        }

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new RuntimeException("User is not a member of this team"));
        teamMemberRepository.delete(member);
    }

    // ── Send email to a user ─────────────────────────────────────────────────

    public void sendEmailToUser(String to, String subject, String message) {
        if (to == null || to.trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required");
        }
        if (subject == null || subject.trim().isEmpty()) {
            throw new IllegalArgumentException("Subject is required");
        }
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("Message body is required");
        }

        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setTo(to.trim());
        mail.setSubject(subject.trim());
        mail.setText(message.trim());
        mailSender.send(mail);
    }

    private AdminTeamDTO toAdminTeamDTO(Team team) {
        int memberCount = teamMemberRepository.countByTeamId(team.getId());

        // Resolve advisor name via ProjectRepository (Team has no direct project FK)
        // findByTeamId returns empty Optional if team has no project yet — safe.
        String advisorName = projectRepository.findByTeamId(team.getId())
                .map(proj -> proj.getSupervisorId())
                .filter(sid -> sid != null)
                .flatMap(sid -> userRepository.findById(sid))
                .map(User::getName)
                .orElse(null);

        return AdminTeamDTO.builder()
                .id(team.getId())
                .teamName(team.getTeamName())
                .leaderName(team.getLeader().getName())
                .leaderId(team.getLeader().getId())
                .advisorName(advisorName)
                .status(team.getStatus())
                .memberCount(memberCount)
                .createdAt(team.getCreatedAt())
                .build();
    }

    private AdminPostDTO toAdminPostDTO(Post post) {
        // Look up the author name from userId — the Post entity only stores authorId
        String authorName = userRepository.findById(post.getAuthorId())
                .map(u -> u.getName())
                .orElse("Unknown");
        int upvotes   = voteRepository.countByPostIdAndVoteType(post.getId(), VoteType.UPVOTE);
        int downvotes = voteRepository.countByPostIdAndVoteType(post.getId(), VoteType.DOWNVOTE);
        return AdminPostDTO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .description(post.getDescription())
                .category(post.getCategory())
                .authorId(post.getAuthorId())
                .authorName(authorName)
                .voteCount(post.getVoteCount())
                .upvoteCount(upvotes)
                .downvoteCount(downvotes)
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}