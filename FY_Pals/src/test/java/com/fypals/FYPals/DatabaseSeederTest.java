package com.fypals.FYPals;

import com.fypals.FYPals.chat.ChatMessageRepository;
import com.fypals.FYPals.content.repository.CommentRepository;
import com.fypals.FYPals.content.repository.PostRepository;
import com.fypals.FYPals.content.repository.VoteRepository;
import com.fypals.FYPals.deliverable.repository.DeliverableRepository;
import com.fypals.FYPals.deliverable.repository.FeedbackRepository;
import com.fypals.FYPals.dispute.repository.DisputeRepository;
import com.fypals.FYPals.dispute.repository.PollRepository;
import com.fypals.FYPals.dispute.repository.PollVoteRepository;
import com.fypals.FYPals.enums.MemberRole;
import com.fypals.FYPals.enums.Role;
import com.fypals.FYPals.enums.TeamStatus;
import com.fypals.FYPals.notification.repository.NotificationRepository;
import com.fypals.FYPals.progress.entity.Project;
import com.fypals.FYPals.progress.repository.CheckpointRepository;
import com.fypals.FYPals.progress.repository.PhaseRepository;
import com.fypals.FYPals.progress.repository.ProjectRepository;
import com.fypals.FYPals.team.entity.Team;
import com.fypals.FYPals.team.entity.TeamMember;
import com.fypals.FYPals.team.repository.TeamMemberRepository;
import com.fypals.FYPals.team.repository.TeamRepository;
import com.fypals.FYPals.user.entity.*;
import com.fypals.FYPals.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@SpringBootTest
public class DatabaseSeederTest {

    @Autowired private ChatMessageRepository chatMessageRepository;
    @Autowired private CommentRepository commentRepository;
    @Autowired private VoteRepository voteRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private PollVoteRepository pollVoteRepository;
    @Autowired private PollRepository pollRepository;
    @Autowired private DisputeRepository disputeRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private DeliverableRepository deliverableRepository;
    @Autowired private CheckpointRepository checkpointRepository;
    @Autowired private PhaseRepository phaseRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private TeamMemberRepository teamMemberRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private UserRepository userRepository;

    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @Rollback(false) // Commit the changes so the DB remains seeded
    @Transactional
    public void resetAndSeedDatabase() {
        System.out.println(">>> Clearing database...");
        
        chatMessageRepository.deleteAllInBatch();
        commentRepository.deleteAllInBatch();
        voteRepository.deleteAllInBatch();
        postRepository.deleteAllInBatch();
        pollVoteRepository.deleteAllInBatch();
        pollRepository.deleteAllInBatch();
        disputeRepository.deleteAllInBatch();
        feedbackRepository.deleteAllInBatch();
        deliverableRepository.deleteAllInBatch();
        checkpointRepository.deleteAllInBatch();
        phaseRepository.deleteAllInBatch();
        notificationRepository.deleteAllInBatch();
        projectRepository.deleteAllInBatch();
        teamMemberRepository.deleteAllInBatch();
        teamRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        System.out.println(">>> Database cleared. Seeding fresh users...");

        // 1. Admin
        Admin admin = new Admin();
        admin.setEmail("admin@gmail.com");
        admin.setPassword(passwordEncoder.encode("Password@123"));
        admin.setRole(Role.ADMIN);
        admin.setName("Admin User");
        admin.setProfileComplete(true);
        admin = userRepository.save(admin);

        // 2. FYP Staff
        FYPStaff staff1 = new FYPStaff();
        staff1.setEmail("fypstaff1@gmail.com");
        staff1.setPassword(passwordEncoder.encode("Password@123"));
        staff1.setRole(Role.FYP_STAFF);
        staff1.setName("FYP Staff 1");
        staff1.setDesignation("Coordinator");
        staff1.setProfileComplete(true);
        staff1 = userRepository.save(staff1);

        FYPStaff staff2 = new FYPStaff();
        staff2.setEmail("fypstaff2@gmail.com");
        staff2.setPassword(passwordEncoder.encode("Password@123"));
        staff2.setRole(Role.FYP_STAFF);
        staff2.setName("FYP Staff 2");
        staff2.setDesignation("Assistant Coordinator");
        staff2.setProfileComplete(true);
        staff2 = userRepository.save(staff2);

        // 3. Students
        Student student1 = new Student();
        student1.setEmail("student1@gmail.com");
        student1.setPassword(passwordEncoder.encode("Password@123"));
        student1.setRole(Role.STUDENT);
        student1.setName("Student 1");
        student1.setGpa(3.5);
        student1.setProfileComplete(true);
        student1 = userRepository.save(student1);

        Student student2 = new Student();
        student2.setEmail("student2@gmail.com");
        student2.setPassword(passwordEncoder.encode("Password@123"));
        student2.setRole(Role.STUDENT);
        student2.setName("Student 2");
        student2.setGpa(3.8);
        student2.setProfileComplete(true);
        student2 = userRepository.save(student2);

        // 4. Advisors
        Advisor advisor1 = new Advisor();
        advisor1.setEmail("advisor1@gmail.com");
        advisor1.setPassword(passwordEncoder.encode("Password@123"));
        advisor1.setRole(Role.ADVISOR);
        advisor1.setName("Advisor 1");
        advisor1.setDepartment("Computer Science");
        advisor1.setResearchAreas("Machine Learning, AI");
        advisor1.setProfileComplete(true);
        advisor1 = userRepository.save(advisor1);

        Advisor advisor2 = new Advisor();
        advisor2.setEmail("advisor2@gmail.com");
        advisor2.setPassword(passwordEncoder.encode("Password@123"));
        advisor2.setRole(Role.ADVISOR);
        advisor2.setName("Advisor 2");
        advisor2.setDepartment("Software Engineering");
        advisor2.setResearchAreas("Blockchain, Web3");
        advisor2.setProfileComplete(true);
        advisor2 = userRepository.save(advisor2);

        System.out.println(">>> Users seeded. Creating teams and projects...");

        // 5. Team 1 and Project 1
        Team team1 = new Team();
        team1.setTeamName("Alpha Team");
        team1.setLeader(student1);
        team1.setStatus(TeamStatus.ACTIVE);
        team1 = teamRepository.save(team1);

        TeamMember member1 = new TeamMember();
        member1.setTeam(team1);
        member1.setUser(student1);
        member1.setMemberRole(MemberRole.LEADER);
        teamMemberRepository.save(member1);

        Project project1 = new Project();
        project1.setTeam(team1);
        project1.setProjectName("AI Smart Campus");
        project1.setDescription("An AI assistant for managing campus activities.");
        project1.setStatus("ACTIVE");
        project1.setSupervisorId(advisor1.getId());
        project1.setStartDate(LocalDate.now());
        projectRepository.save(project1);

        // 6. Team 2 and Project 2
        Team team2 = new Team();
        team2.setTeamName("Beta Team");
        team2.setLeader(student2);
        team2.setStatus(TeamStatus.ACTIVE);
        team2 = teamRepository.save(team2);

        TeamMember member2 = new TeamMember();
        member2.setTeam(team2);
        member2.setUser(student2);
        member2.setMemberRole(MemberRole.LEADER);
        teamMemberRepository.save(member2);

        Project project2 = new Project();
        project2.setTeam(team2);
        project2.setProjectName("Blockchain Supply Chain");
        project2.setDescription("A blockchain logistics platform for tracking shipments.");
        project2.setStatus("ACTIVE");
        project2.setSupervisorId(advisor2.getId());
        project2.setStartDate(LocalDate.now());
        projectRepository.save(project2);

        System.out.println(">>> Database refresh and seeding complete!");
    }
}
