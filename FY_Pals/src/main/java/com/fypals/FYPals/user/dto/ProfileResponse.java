package com.fypals.FYPals.user.dto;

import com.fypals.FYPals.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private Long id;
    private String email;
    private String name;
    private String bio;
    private String skills;
    private Role role;
    private boolean profileComplete;
    private Long teamId;

    // Student fields
    private Double gpa;
    private String interests;
    private String pastProjects;

    // Advisor fields
    private String department;
    private String researchAreas;

    // FYPStaff fields
    private String designation;
}