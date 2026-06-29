package com.fypals.FYPals.fypstaff;

import com.fypals.FYPals.enums.Role;
import com.fypals.FYPals.progress.repository.ProjectRepository;
import com.fypals.FYPals.team.repository.TeamRepository;
import com.fypals.FYPals.user.entity.User;
import com.fypals.FYPals.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/fyp-staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('FYP_STAFF')")
public class FYPStaffController {

    private final UserRepository    userRepository;
    private final TeamRepository    teamRepository;
    private final ProjectRepository projectRepository;

    // GET /fyp-staff/advisors — list all advisors
    @GetMapping("/advisors")
    public ResponseEntity<?> getAllAdvisors() {
        List<User> advisors = userRepository.findByRole(Role.ADVISOR);
        List<Map<String, Object>> result = advisors.stream().map(a -> {
            int teamCount = projectRepository.findBySupervisorId(a.getId()).size();
            return Map.<String, Object>of(
                    "id",              a.getId(),
                    "name",            a.getName(),
                    "email",           a.getEmail(),
                    "bio",             a.getBio() != null ? a.getBio() : "",
                    "profileComplete", a.isProfileComplete(),
                    "teamCount",       teamCount
            );
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // GET /fyp-staff/advisors/{advisorId}/teams — teams supervised by this advisor
    @Transactional
    @GetMapping("/advisors/{advisorId}/teams")
    public ResponseEntity<?> getTeamsByAdvisor(@PathVariable Long advisorId) {
        List<Map<String, Object>> result = projectRepository.findBySupervisorId(advisorId)
                .stream()
                .map(project -> {
                    var team = project.getTeam();
                    return Map.<String, Object>of(
                            "teamId",      team.getId(),
                            "teamName",    team.getTeamName(),
                            "status",      team.getStatus().name(),
                            "memberCount", team.getMembers().size(),
                            "projectId",   project.getId()
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}