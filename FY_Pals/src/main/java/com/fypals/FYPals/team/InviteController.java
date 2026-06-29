package com.fypals.FYPals.team;

import com.fypals.FYPals.team.service.InviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    @PostMapping("/{teamId}/invites/{notificationId}/accept")
    public ResponseEntity<Map<String, String>> acceptInvite(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long teamId,
            @PathVariable Long notificationId) {

        String result = inviteService.acceptInvite(
                userDetails.getUsername(), teamId, notificationId);
        return ResponseEntity.ok(Map.of("message", result));
    }

    @PostMapping("/{teamId}/invites/{notificationId}/decline")
    public ResponseEntity<Map<String, String>> declineInvite(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long teamId,
            @PathVariable Long notificationId) {

        String result = inviteService.declineInvite(
                userDetails.getUsername(), teamId, notificationId);
        return ResponseEntity.ok(Map.of("message", result));
    }
}