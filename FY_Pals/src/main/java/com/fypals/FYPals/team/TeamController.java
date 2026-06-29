package com.fypals.FYPals.team;

import com.fypals.FYPals.team.entity.Team;
import com.fypals.FYPals.team.service.TeamService;
import com.fypals.FYPals.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService    teamService;
    private final UserRepository userRepository;

    private Long getUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found")).getId();
    }

    @PostMapping
    public ResponseEntity<?> formTeam(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String teamName) {
        Long userId = getUserId(userDetails);
        Team team = teamService.formTeam(userId, teamName);
        return ResponseEntity.ok(Map.of(
                "message",  "Team created",
                "teamId",   team.getId(),
                "teamName", team.getTeamName()
        ));
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<?> getTeam(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamService.getTeam(teamId));
    }

    @PostMapping("/{teamId}/invite-student")
    public ResponseEntity<?> inviteStudent(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long teamId,
            @RequestParam Long targetUserId) {
        Long leaderId = getUserId(userDetails);
        teamService.inviteStudent(leaderId, teamId, targetUserId);
        return ResponseEntity.ok(Map.of("message", "Invite sent successfully"));
    }

    /** NEW: Invite an advisor to supervise the team */
    @PostMapping("/{teamId}/invite-advisor")
    public ResponseEntity<?> inviteAdvisor(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long teamId,
            @RequestParam Long advisorId) {
        Long leaderId = getUserId(userDetails);
        teamService.inviteAdvisor(leaderId, teamId, advisorId);
        return ResponseEntity.ok(Map.of("message", "Advisor invite sent"));
    }

    @DeleteMapping("/{teamId}/members/{memberId}")
    public ResponseEntity<?> dropMember(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long teamId,
            @PathVariable Long memberId) {
        Long leaderId = getUserId(userDetails);
        teamService.dropMember(leaderId, teamId, memberId);
        return ResponseEntity.ok(Map.of("message", "Member dropped successfully"));
    }

    @PostMapping("/{teamId}/leave")
    public ResponseEntity<?> leaveTeam(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long teamId) {
        Long userId = getUserId(userDetails);
        teamService.leaveTeam(userId, teamId);
        return ResponseEntity.ok(Map.of("message", "You have left the team"));
    }

    @PostMapping("/{teamId}/transfer-and-leave")
    public ResponseEntity<?> transferAndLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long teamId,
            @RequestParam Long newLeaderId) {
        Long currentLeaderId = getUserId(userDetails);
        teamService.transferLeadershipAndLeave(currentLeaderId, teamId, newLeaderId);
        return ResponseEntity.ok(Map.of("message", "Leadership transferred and you have left the team"));
    }
}