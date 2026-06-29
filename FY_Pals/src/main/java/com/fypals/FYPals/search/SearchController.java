package com.fypals.FYPals.search;

import com.fypals.FYPals.search.dto.SearchResultDTO;
import com.fypals.FYPals.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService  searchService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<SearchResultDTO>> search(
            @RequestParam String q,
            @RequestParam(required = false) String type,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long currentUserId = null;
        if (userDetails != null) {
            currentUserId = userRepository.findByEmail(userDetails.getUsername())
                    .map(u -> u.getId())
                    .orElse(null);
        }

        return ResponseEntity.ok(searchService.search(q, type, currentUserId));
    }
}