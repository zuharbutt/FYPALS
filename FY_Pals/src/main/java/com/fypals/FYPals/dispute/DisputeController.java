package com.fypals.FYPals.dispute;

import com.fypals.FYPals.dispute.entity.Dispute;
import com.fypals.FYPals.dispute.entity.Poll;
import com.fypals.FYPals.dispute.entity.PollVote;
import com.fypals.FYPals.dispute.service.DisputeService;
import com.fypals.FYPals.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/disputes")
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeService disputeService;
    private final UserRepository userRepository;

    private Long getUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found")).getId();
    }

    @PostMapping
    public ResponseEntity<?> raiseDispute(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long teamId = Long.valueOf(body.get("teamId").toString());
        String targetItem = body.get("targetItem").toString();
        String reason = body.get("reason").toString();
        Dispute dispute = disputeService.raiseDispute(teamId, getUserId(userDetails), targetItem, reason);
        return ResponseEntity.ok(Map.of("success", true, "data", dispute));
    }

    @GetMapping("/team/{teamId}/pending")
    public ResponseEntity<?> getPendingDisputes(@PathVariable Long teamId) {
        List<Dispute> disputes = disputeService.getPendingDisputes(teamId);
        return ResponseEntity.ok(Map.of("success", true, "data", disputes));
    }

    @GetMapping("/team/{teamId}/all")
    public ResponseEntity<?> getAllDisputes(@PathVariable Long teamId) {
        List<Dispute> disputes = disputeService.getAllDisputes(teamId);
        return ResponseEntity.ok(Map.of("success", true, "data", disputes));
    }

    @PostMapping("/{disputeId}/reject")
    public ResponseEntity<?> rejectDispute(
            @PathVariable Long disputeId,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String rejectionReason = (body != null && body.containsKey("rejectionReason"))
                ? body.get("rejectionReason").toString() : "No reason provided";
        Dispute dispute = disputeService.rejectDispute(disputeId, getUserId(userDetails), rejectionReason);
        return ResponseEntity.ok(Map.of("success", true, "data", dispute));
    }

    @PostMapping("/{disputeId}/accept")
    public ResponseEntity<?> acceptDispute(
            @PathVariable Long disputeId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Dispute dispute = disputeService.acceptDispute(disputeId, getUserId(userDetails));
        return ResponseEntity.ok(Map.of("success", true, "data", dispute));
    }

    @PostMapping("/{disputeId}/poll")
    public ResponseEntity<?> createPoll(
            @PathVariable Long disputeId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String question = body.get("question").toString();
        String options = body.get("options").toString();
        LocalDateTime deadline = LocalDateTime.parse(body.get("deadline").toString());
        Poll poll = disputeService.acceptDisputeAndCreatePoll(disputeId, getUserId(userDetails), question, options, deadline);
        return ResponseEntity.ok(Map.of("success", true, "data", poll));
    }

    @GetMapping("/{disputeId}/poll")
    public ResponseEntity<?> getPoll(@PathVariable Long disputeId) {
        Poll poll = disputeService.getPollByDispute(disputeId);
        return ResponseEntity.ok(Map.of("success", true, "data", poll));
    }

    @PostMapping("/{disputeId}/polls/{pollId}/vote")
    public ResponseEntity<?> voteOnPoll(
            @PathVariable Long disputeId,
            @PathVariable Long pollId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String chosenOption = body.get("chosenOption").toString();
        PollVote vote = disputeService.voteOnPoll(pollId, getUserId(userDetails), chosenOption);
        return ResponseEntity.ok(Map.of("success", true, "data", vote));
    }

    @GetMapping("/{disputeId}/polls/{pollId}/results")
    public ResponseEntity<?> getPollResults(
            @PathVariable Long disputeId,
            @PathVariable Long pollId) {
        Map<String, Long> results = disputeService.getPollResults(pollId);
        return ResponseEntity.ok(Map.of("success", true, "data", results));
    }

    @PostMapping("/{disputeId}/resolve")
    public ResponseEntity<?> resolveDispute(
            @PathVariable Long disputeId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Dispute dispute = disputeService.resolveDispute(disputeId, getUserId(userDetails));
        return ResponseEntity.ok(Map.of("success", true, "data", dispute));
    }

    @GetMapping("/{disputeId}")
    public ResponseEntity<?> getDispute(@PathVariable Long disputeId) {
        Dispute dispute = disputeService.getDispute(disputeId);
        return ResponseEntity.ok(Map.of("success", true, "data", dispute));
    }
}