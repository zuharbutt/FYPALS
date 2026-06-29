package com.fypals.FYPals.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfileUpdateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @Size(max = 1000, message = "Bio must be under 1000 characters")
    private String bio;

    private String skills;      // comma-separated, e.g. "Java, Python, React"

    // Student-only fields (optional for others)
    private Double gpa;
    private String interests;
    private String pastProjects;

    // Advisor-only fields (optional for others)
    private String department;
    private String researchAreas;

    // FYPStaff-only fields
    private String designation;
}