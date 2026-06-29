package com.fypals.FYPals.search;

import com.fypals.FYPals.content.entity.Post;
import com.fypals.FYPals.content.repository.PostRepository;
import com.fypals.FYPals.search.dto.SearchResultDTO;
import com.fypals.FYPals.user.entity.User;
import com.fypals.FYPals.user.repository.UserRepository;
import com.fypals.FYPals.enums.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    /**
     * FIX 8: Search now uses LIKE matching on title, description, AND skills/interests.
     * Previously only matched exact sub-strings in description.
     * Now searches across: post title, post description, user name, user skills, user interests, user bio.
     *
     * @param keyword       Search term
     * @param type          Optional filter: "post", "student", "advisor" — null means all
     * @param currentUserId Exclude from results
     */
    public List<SearchResultDTO> search(String keyword, String type, Long currentUserId) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return new ArrayList<>();
        }

        List<SearchResultDTO> results = new ArrayList<>();

        if (type == null || type.equalsIgnoreCase("post") || type.equalsIgnoreCase("all")) {
            // Post search: title OR description
            postRepository.searchByKeyword(keyword)
                    .stream()
                    .map(this::postToDTO)
                    .forEach(results::add);
        }

        if (type == null || type.equalsIgnoreCase("all")
                || type.equalsIgnoreCase("student")
                || type.equalsIgnoreCase("advisor")
                || type.equalsIgnoreCase("user")) {

            // FIX 8: User search now uses extended keyword search including skills and bio
            userRepository.searchByKeywordExtended(keyword)
                    .stream()
                    .filter(u -> u.getRole() == Role.STUDENT || u.getRole() == Role.ADVISOR)
                    .filter(u -> currentUserId == null || !u.getId().equals(currentUserId))
                    .filter(u -> {
                        if ("student".equalsIgnoreCase(type)) return u.getRole() == Role.STUDENT;
                        if ("advisor".equalsIgnoreCase(type))  return u.getRole() == Role.ADVISOR;
                        return true;
                    })
                    .map(this::userToDTO)
                    .forEach(results::add);
        }

        return results;
    }

    private SearchResultDTO postToDTO(Post post) {
        return SearchResultDTO.builder()
                .id(post.getId())
                .type("post")
                .title(post.getTitle())
                .description(post.getDescription())
                .extra(post.getCategory() != null ? post.getCategory().name() : null)
                .build();
    }

    private SearchResultDTO userToDTO(User user) {
        return SearchResultDTO.builder()
                .id(user.getId())
                .type(user.getRole().name().toLowerCase())
                .title(user.getName())
                .description(user.getSkills())
                .extra(user.getBio())
                .build();
    }
}