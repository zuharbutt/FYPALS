package com.fypals.FYPals.admin.dto;

import com.fypals.FYPals.enums.TeamStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminTeamDTO {
    private Long id;
    private String teamName;
    private String leaderName;
    private Long leaderId;
    private String advisorName;   // null if no advisor assigned yet
    private TeamStatus status;
    private int memberCount;
    private LocalDateTime createdAt;
}