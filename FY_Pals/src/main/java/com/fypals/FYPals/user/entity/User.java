package com.fypals.FYPals.user.entity;

import com.fypals.FYPals.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "dtype", discriminatorType = DiscriminatorType.STRING)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
// NOTE: @Builder removed — it breaks subclass instantiation (Student, Advisor etc.)
// @Data also removed — it generates equals/hashCode which conflicts with @EqualsAndHashCode
// in subclasses. Use @Getter + @Setter instead.
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String name;

    @Column(length = 1000)
    private String bio;

    private String skills;

    private boolean profileComplete = false;

    private LocalDateTime createdAt;

    // Set when admin changes role — used to invalidate tokens issued before this time
    private LocalDateTime roleChangedAt;

    // Keep a basic toString for logging — avoids circular reference from @Data
    @Override
    public String toString() {
        return "User{id=" + id + ", email='" + email + "', role=" + role + "}";
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}