package com.fypals.FYPals.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultDTO {
    private Long id;
    private String type;        // "post", "student", "advisor"
    private String title;       // post title OR user name
    private String description; // post description OR user skills/bio
    private String extra;       // category for posts, role for users
}