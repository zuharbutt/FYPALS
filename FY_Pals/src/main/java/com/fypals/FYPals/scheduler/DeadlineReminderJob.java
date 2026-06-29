package com.fypals.FYPals.scheduler;

import com.fypals.FYPals.deliverable.entity.Deliverable;
import com.fypals.FYPals.deliverable.repository.DeliverableRepository;
import com.fypals.FYPals.team.entity.TeamMember;
import com.fypals.FYPals.team.repository.TeamMemberRepository;
import com.fypals.FYPals.user.entity.User;
import com.fypals.FYPals.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * UC-8c — Deadline Email Reminders.
 *
 * Runs every day at 8:00 AM and emails all team members + advisor
 * for any deliverable whose deadline is tomorrow and status is still PENDING or SUBMITTED.
 *
 * To test: temporarily change the cron to "0 * * * * *" (every minute),
 * watch the logs, then change it back to the daily schedule.
 *
 * Requires in application.properties:
 *   spring.mail.host=smtp.gmail.com
 *   spring.mail.port=587
 *   spring.mail.username=your-gmail@gmail.com
 *   spring.mail.password=your-app-password
 *   spring.mail.properties.mail.smtp.auth=true
 *   spring.mail.properties.mail.smtp.starttls.enable=true
 *
 * Also add @EnableScheduling to your main FYPalsApplication class.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeadlineReminderJob {

    private final DeliverableRepository  deliverableRepository;
    private final TeamMemberRepository   teamMemberRepository;
    private final UserRepository         userRepository;
    private final JavaMailSender         mailSender;

    // Runs every day at 08:00 AM server time
    // To test quickly: change to "0 * * * * *" (every minute)
    @Scheduled(cron = "0 0 8 * * *")
    public void sendDeadlineReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        log.info("[DeadlineReminderJob] Checking deliverables due on {}", tomorrow);

        // Find deliverables due tomorrow that haven't been approved yet
        List<Deliverable> upcoming = deliverableRepository.findByDeadlineAndStatusNot(
                tomorrow, "APPROVED"
        );

        if (upcoming.isEmpty()) {
            log.info("[DeadlineReminderJob] No upcoming deadlines found.");
            return;
        }

        for (Deliverable deliverable : upcoming) {
            try {
                sendRemindersForDeliverable(deliverable);
            } catch (Exception e) {
                log.error("[DeadlineReminderJob] Failed to send reminder for deliverable {}: {}",
                        deliverable.getId(), e.getMessage());
            }
        }
    }

    private void sendRemindersForDeliverable(Deliverable deliverable) {
        Long teamId = deliverable.getProject().getTeam().getId();

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);

        String subject = "⏰ FYPals Deadline Reminder: " + deliverable.getTitle();
        String body = buildEmailBody(deliverable);

        for (TeamMember tm : members) {
            userRepository.findById(tm.getUser().getId()).ifPresent(user -> {
                sendEmail(user.getEmail(), subject, body);
                log.info("[DeadlineReminderJob] Sent reminder to {} for deliverable '{}'",
                        user.getEmail(), deliverable.getTitle());
            });
        }

        if (deliverable.getProject().getSupervisorId() != null) {
            userRepository.findById(deliverable.getProject().getSupervisorId()).ifPresent(advisor -> {
                sendEmail(advisor.getEmail(), subject, body);
                log.info("[DeadlineReminderJob] Sent reminder to advisor {} for deliverable '{}'",
                        advisor.getEmail(), deliverable.getTitle());
            });
        }
    }

    private String buildEmailBody(Deliverable deliverable) {
        return String.format("""
                Hello,
                
                This is a reminder that the following FYP deliverable is due tomorrow:
                
                  Title:    %s
                  Deadline: %s
                  Status:   %s
                
                Please ensure your submission is complete before the deadline.
                
                Log in at http://localhost:3000 to submit or check your progress.
                
                — FYPals
                """,
                deliverable.getTitle(),
                deliverable.getDeadline(),
                deliverable.getStatus()
        );
    }

    private void sendEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}