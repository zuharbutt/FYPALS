package com.fypals.FYPals.deliverable;

import com.fypals.FYPals.deliverable.entity.Deliverable;
import com.fypals.FYPals.deliverable.repository.DeliverableRepository;
import com.fypals.FYPals.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DeliverableScheduler {

    private final DeliverableRepository deliverableRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Scheduled(cron = "0 0 8 * * *")
    public void sendDeadlineReminders() {
        LocalDate today = LocalDate.now();
        LocalDate threeDaysFromNow = today.plusDays(3);

        List<Deliverable> upcoming = deliverableRepository
                .findByDeadlineBetweenAndStatusNotAndReminderSentFalse(
                        today, threeDaysFromNow, "SUBMITTED");

        for (Deliverable d : upcoming) {
            if (d.getProject() != null && d.getProject().getTeam() != null) {
                Long leaderId = d.getProject().getTeam().getLeader().getId();
                String leaderEmail = d.getProject().getTeam().getLeader().getEmail();

                // Send in-app notification
                notificationService.sendNotification(
                        leaderId,
                        "Reminder: Deliverable '" + d.getTitle() + "' is due on " + d.getDeadline(),
                        "DEADLINE_REMINDER",
                        d.getId()
                );

                // Send email
                emailService.sendEmail(
                        leaderEmail,
                        "FYPals Deadline Reminder: " + d.getTitle(),
                        "Your deliverable '" + d.getTitle() + "' is due on " + d.getDeadline() + ". Please submit before the deadline."
                );

                d.setReminderSent(true);
                deliverableRepository.save(d);
                log.info("Reminder sent for deliverable: {}", d.getTitle());
            }
        }
    }
}