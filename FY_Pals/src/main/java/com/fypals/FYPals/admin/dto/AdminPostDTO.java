package com.fypals.FYPals.admin.dto;

import com.fypals.FYPals.enums.PostCategory;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPostDTO {
    private Long id;
    private String title;
    private String description;
    private PostCategory category;
    private String authorName;
    private Long authorId;
    private int voteCount;
    private int upvoteCount;
    private int downvoteCount;
    private int commentCount;
    private LocalDateTime createdAt;
}