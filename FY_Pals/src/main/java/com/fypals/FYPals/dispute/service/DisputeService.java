package com.fypals.FYPals.dispute.service;

import com.fypals.FYPals.notification.service.NotificationService;
import com.fypals.FYPals.dispute.entity.Dispute;
import com.fypals.FYPals.dispute.entity.Poll;
import com.fypals.FYPals.dispute.entity.PollVote;
import com.fypals.FYPals.dispute.repository.DisputeRepository;
import com.fypals.FYPals.dispute.repository.PollRepository;
import com.fypals.FYPals.dispute.repository.PollVoteRepository;
import com.fypals.FYPals.enums.DisputeStatus;
import com.fypals.FYPals.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DisputeService {

    @Autowired private DisputeRepository  disputeRepository;
    @Autowired private PollRepository     pollRepository;
    @Autowired private PollVoteRepository pollVoteRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private UserRepository     userRepository;
    @Autowired private com.fypals.FYPals.team.repository.TeamRepository teamRepository;

    private Dispute enrich(Dispute d) {
        userRepository.findById(d.getRaisedBy())
                .ifPresent(u -> d.setRaisedByName(u.getName()));
        if (d.getResolvedByDispute() != null) {
            userRepository.findById(d.getResolvedByDispute())
                    .ifPresent(u -> d.setResolvedByName(u.getName()));
        }
        return d;
    }

    private String computeWinningOption(Long disputeId) {
        try {
            List<Poll> polls = pollRepository.findAllByDisputeId(disputeId);
            if (polls.isEmpty()) return null;
            Poll poll = polls.get(polls.size() - 1);
            List<PollVote> votes = pollVoteRepository.findByPollId(poll.getId());
            if (votes.isEmpty()) return null;

            Map<String, Long> counts = votes.stream()
                    .collect(Collectors.groupingBy(PollVote::getChosenOption, Collectors.counting()));

            long maxCount = counts.values().stream().mapToLong(Long::longValue).max().orElse(0);
            List<String> topOptions = counts.entrySet().stream()
                    .filter(e -> e.getValue() == maxCount)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            if (topOptions.size() > 1) return "Tie — no single decision";
            return topOptions.get(0);
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public Dispute raiseDispute(Long teamId, Long raisedBy, String targetItem, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new RuntimeException("Reason cannot be empty");
        }
        if (targetItem == null || targetItem.trim().isEmpty()) {
            throw new RuntimeException("Target item cannot be empty");
        }
        Dispute saved = disputeRepository.save(new Dispute(teamId, raisedBy, targetItem, reason));

        // Notify team leader about the raised dispute
        teamRepository.findById(teamId).ifPresent(team -> {
            if (team.getLeader() != null && !team.getLeader().getId().equals(raisedBy)) {
                notificationService.sendNotification(
                        team.getLeader().getId(),
                        "A dispute has been raised about '" + targetItem + "'",
                        "DISPUTE_RAISED",
                        saved.getId()
                );
            }
        });

        return enrich(saved);
    }

    public List<Dispute> getPendingDisputes(Long teamId) {
        return disputeRepository.findByTeamIdAndStatus(teamId, DisputeStatus.PENDING)
                .stream().map(this::enrich).collect(Collectors.toList());
    }

    public List<Dispute> getAllDisputes(Long teamId) {
        return disputeRepository.findByTeamId(teamId)
                .stream().map(this::enrich).collect(Collectors.toList());
    }

    @Transactional
    public Dispute rejectDispute(Long disputeId, Long leaderId, String rejectionReason) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found"));
        dispute.setStatus(DisputeStatus.REJECTED);
        dispute.setRejectionReason(rejectionReason);
        dispute.setResolvedAt(LocalDateTime.now());
        dispute.setResolvedByDispute(leaderId);
        Dispute saved = disputeRepository.save(dispute);
        notificationService.sendNotification(dispute.getRaisedBy(),
                "Your dispute about '" + dispute.getTargetItem() + "' was rejected. Reason: " + rejectionReason,
                "DISPUTE_REJECTED", disputeId);
        return enrich(saved);
    }

    @Transactional
    public Dispute acceptDispute(Long disputeId, Long leaderId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found"));
        dispute.setStatus(DisputeStatus.OPEN);
        Dispute saved = disputeRepository.save(dispute);
        notificationService.sendNotification(dispute.getRaisedBy(),
                "Your dispute about '" + dispute.getTargetItem() + "' was accepted. A poll will be created.",
                "DISPUTE_ACCEPTED", disputeId);
        return enrich(saved);
    }

    @Transactional
    public Dispute resolveDispute(Long disputeId, Long leaderId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found"));
        String winning = computeWinningOption(disputeId);
        dispute.setStatus(DisputeStatus.RESOLVED);
        dispute.setResolvedAt(LocalDateTime.now());
        dispute.setResolvedByDispute(leaderId);
        dispute.setWinningOption(winning);
        Dispute saved = disputeRepository.save(dispute);
        String msg = winning != null
                ? "Your dispute about '" + dispute.getTargetItem() + "' was resolved. Decision: " + winning
                : "Your dispute about '" + dispute.getTargetItem() + "' has been resolved.";
        notificationService.sendNotification(dispute.getRaisedBy(), msg, "DISPUTE_RESOLVED", disputeId);
        return enrich(saved);
    }

    @Transactional
    public Poll acceptDisputeAndCreatePoll(Long disputeId, Long leaderId, String question,
                                           String options, LocalDateTime deadline) {
        // FIX 9: Validate poll deadline is not in the past
        if (deadline != null && deadline.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Poll voting deadline cannot be in the past");
        }
        if (question == null || question.trim().isEmpty()) {
            throw new IllegalArgumentException("Poll question is required");
        }
        if (options == null || options.trim().isEmpty()) {
            throw new IllegalArgumentException("Poll options are required");
        }

        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found"));
        dispute.setStatus(DisputeStatus.OPEN);
        disputeRepository.save(dispute);
        return pollRepository.save(new Poll(disputeId, question, leaderId, options, deadline));
    }

    public Poll getPollByDispute(Long disputeId) {
        List<Poll> polls = pollRepository.findAllByDisputeId(disputeId);
        if (polls.isEmpty()) throw new RuntimeException("Poll not found for this dispute");
        return polls.get(polls.size() - 1);
    }

    @Transactional
    public PollVote voteOnPoll(Long pollId, Long voterId, String chosenOption) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new RuntimeException("Poll not found"));
        if (poll.getDeadline() != null && LocalDateTime.now().isAfter(poll.getDeadline())) {
            throw new RuntimeException("Voting deadline has passed");
        }
        if (pollVoteRepository.findByPollIdAndVoterId(pollId, voterId).isPresent()) {
            throw new RuntimeException("You have already voted on this poll");
        }
        return pollVoteRepository.save(new PollVote(pollId, voterId, chosenOption));
    }

    public Map<String, Long> getPollResults(Long pollId) {
        return pollVoteRepository.findByPollId(pollId).stream()
                .collect(Collectors.groupingBy(PollVote::getChosenOption, Collectors.counting()));
    }

    public Dispute getDispute(Long disputeId) {
        return enrich(disputeRepository.findById(disputeId)
                .orElseThrow(() -> new RuntimeException("Dispute not found")));
    }
}