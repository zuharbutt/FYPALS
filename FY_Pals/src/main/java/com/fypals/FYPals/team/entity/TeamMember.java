package com.fypals.FYPals.team.entity;

import com.fypals.FYPals.enums.MemberRole;
import com.fypals.FYPals.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "team_members")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false)
    private MemberRole memberRole;

    @Column(name = "joined_date")
    private LocalDateTime joinedDate;

    @Column(name = "drop_date")
    private LocalDateTime dropDate;

    @PrePersist
    protected void onCreate() {
        joinedDate = LocalDateTime.now();
    }
}