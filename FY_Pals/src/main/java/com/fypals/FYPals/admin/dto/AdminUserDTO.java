package com.fypals.FYPals.admin.dto;

import com.fypals.FYPals.enums.Role;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDTO {
    private Long id;
    private String email;
    private String name;
    private Role role;
    private boolean profileComplete;
    private String skills;
    private String bio;
    private LocalDateTime createdAt;
}