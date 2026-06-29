package com.fypals.FYPals.auth.dto;

import lombok.*;

@Data
@AllArgsConstructor
public class AuthResponse {
    private Long id;       // ← add
    private String name;   // ← add
    private String token;
    private String email;
    private String role;
}