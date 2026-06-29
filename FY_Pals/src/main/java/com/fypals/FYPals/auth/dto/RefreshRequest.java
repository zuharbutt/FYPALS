package com.fypals.FYPals.auth.dto;

import lombok.Data;

@Data
public class RefreshRequest {
    private String token;
}