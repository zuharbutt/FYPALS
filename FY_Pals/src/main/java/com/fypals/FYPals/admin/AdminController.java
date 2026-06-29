package com.fypals.FYPals.admin;

import com.fypals.FYPals.admin.dto.AdminPostDTO;
import com.fypals.FYPals.admin.dto.AdminTeamDTO;
import com.fypals.FYPals.admin.dto.AdminUserDTO;
import com.fypals.FYPals.admin.service.AdminService;
import com.fypals.FYPals.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService   adminService;
    private final UserRepository userRepository;

    private Long getCurrentUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found"))
                .getId();
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserDTO>> getAllUsers(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(adminService.getAllUsers(pageable));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserById(id));
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        adminService.createUser(
                body.get("name"),
                body.get("email"),
                body.get("password"),
                body.get("role")
        );
        return ResponseEntity.ok(Map.of("message", "User created successfully"));
    }

    @PutMapping("/users/{id}/password")
    public ResponseEntity<?> changePassword(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        adminService.changePassword(id, body.get("password"));
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        adminService.updateUserRole(id, body.get("role"));
        return ResponseEntity.ok(Map.of("message", "Role updated successfully"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        adminService.deleteUser(id, getCurrentUserId(userDetails));
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    // ── Teams ─────────────────────────────────────────────────────────────────

    @GetMapping("/teams")
    public ResponseEntity<Page<AdminTeamDTO>> getAllTeams(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(adminService.getAllTeams(pageable));
    }

    @GetMapping("/teams/{id}")
    public ResponseEntity<?> getTeamDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getTeamDetail(id));
    }

    @PostMapping("/teams/{id}/members")
    public ResponseEntity<?> addMember(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {
        adminService.addMemberToTeam(id, body.get("userId"));
        return ResponseEntity.ok(Map.of("message", "Member added successfully"));
    }

    @DeleteMapping("/teams/{id}/members/{userId}")
    public ResponseEntity<?> removeMember(
            @PathVariable Long id,
            @PathVariable Long userId) {
        adminService.removeMemberFromTeam(id, userId);
        return ResponseEntity.ok(Map.of("message", "Member removed successfully"));
    }

    @DeleteMapping("/teams/{id}")
    public ResponseEntity<?> deleteTeam(@PathVariable Long id) {
        adminService.deleteTeam(id);
        return ResponseEntity.ok(Map.of("message", "Team deleted successfully"));
    }

    // ── Email ─────────────────────────────────────────────────────────────────

    @PostMapping("/send-email")
    public ResponseEntity<?> sendEmail(@RequestBody Map<String, String> body) {
        adminService.sendEmailToUser(
                body.get("to"),
                body.get("subject"),
                body.get("message")
        );
        return ResponseEntity.ok(Map.of("message", "Email sent successfully"));
    }

    // ── Posts ─────────────────────────────────────────────────────────────────

    @GetMapping("/posts")
    public ResponseEntity<Page<AdminPostDTO>> getAllPosts(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(adminService.getAllPosts(pageable));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<?> deletePost(@PathVariable Long id) {
        adminService.deletePost(id);
        return ResponseEntity.ok(Map.of("message", "Post deleted successfully"));
    }
}