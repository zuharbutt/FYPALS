package com.fypals.FYPals.content;

import com.fypals.FYPals.content.entity.Comment;
import com.fypals.FYPals.content.entity.Post;
import com.fypals.FYPals.content.service.ContentService;
import com.fypals.FYPals.enums.PostCategory;
import com.fypals.FYPals.enums.VoteType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.fypals.FYPals.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;
    private final UserRepository userRepository;

    private String getAuthorName(Long authorId) {
        return userRepository.findById(authorId)
                .map(u -> u.getName())
                .orElse("Unknown");
    }

    private Map<String, Object> postToMap(Post post) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", post.getId());
        m.put("authorId", post.getAuthorId());
        m.put("authorName", getAuthorName(post.getAuthorId()));
        m.put("title", post.getTitle());
        m.put("description", post.getDescription());
        m.put("category", post.getCategory());
        m.put("voteCount", post.getVoteCount());
        m.put("commentCount", post.getCommentCount());
        m.put("createdAt", post.getCreatedAt());
        m.put("updatedAt", post.getUpdatedAt());
        m.put("upvoteCount", contentService.getUpvoteCount(post.getId()));
        m.put("downvoteCount", contentService.getDownvoteCount(post.getId()));
        return m;
    }

    private Map<String, Object> commentToMap(Comment comment) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", comment.getId());
        m.put("postId", comment.getPostId());
        m.put("authorId", comment.getAuthorId());
        m.put("authorName", getAuthorName(comment.getAuthorId()));
        m.put("content", comment.getContent());
        m.put("createdAt", comment.getCreatedAt());
        return m;
    }

    @PostMapping
    public ResponseEntity<?> createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        Long authorId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found")).getId();
        String title = body.get("title").toString();
        String description = body.get("description").toString();
        PostCategory category = PostCategory.valueOf(body.get("category").toString());
        Post post = contentService.createPost(authorId, title, description, category);
        return ResponseEntity.ok(postToMap(post));
    }

    @GetMapping
    public ResponseEntity<?> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "date") String sortBy,
            @RequestParam(required = false) String category) {
        Page<Post> postsPage;
        if (category != null && !category.isBlank()) {
            postsPage = contentService.getPostsByCategory(PostCategory.valueOf(category), page, size);
        } else {
            postsPage = contentService.getAllPosts(page, size, sortBy);
        }
        List<Map<String, Object>> enriched = postsPage.getContent().stream()
                .map(this::postToMap).collect(Collectors.toList());
        Map<String, Object> result = new HashMap<>();
        result.put("content", enriched);
        result.put("totalElements", postsPage.getTotalElements());
        result.put("totalPages", postsPage.getTotalPages());
        result.put("number", postsPage.getNumber());
        result.put("size", postsPage.getSize());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{postId}")
    public ResponseEntity<?> getPost(@PathVariable Long postId) {
        Post post = contentService.getPost(postId);
        List<Comment> comments = contentService.getCommentsByPost(postId);
        List<Map<String, Object>> enrichedComments = comments.stream()
                .map(this::commentToMap).collect(Collectors.toList());
        Map<String, Object> result = new HashMap<>();
        result.put("post", postToMap(post));
        result.put("comments", enrichedComments);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<?> getPostsByCategory(
            @PathVariable PostCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<Post> postsPage = contentService.getPostsByCategory(category, page, size);
        List<Map<String, Object>> enriched = postsPage.getContent().stream()
                .map(this::postToMap).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("content", enriched,
                "totalElements", postsPage.getTotalElements()));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<?> addComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long postId,
            @RequestBody Map<String, Object> body) {
        Long authorId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found")).getId();
        String content = body.get("content").toString();
        Comment comment = contentService.addComment(postId, authorId, content);
        return ResponseEntity.ok(commentToMap(comment));
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<?> getComments(@PathVariable Long postId) {
        List<Map<String, Object>> enriched = contentService.getCommentsByPost(postId).stream()
                .map(this::commentToMap).collect(Collectors.toList());
        return ResponseEntity.ok(enriched);
    }

    @PostMapping("/{postId}/vote")
    public ResponseEntity<?> voteOnPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long postId,
            @RequestBody Map<String, Object> body) {
        Long userId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found")).getId();
        VoteType voteType = VoteType.valueOf(body.get("voteType").toString());
        Post post = contentService.voteOnPost(postId, userId, voteType);
        return ResponseEntity.ok(Map.of(
                "voteCount", post.getVoteCount(),
                "upvoteCount", contentService.getUpvoteCount(postId),
                "downvoteCount", contentService.getDownvoteCount(postId)
        ));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<?> updatePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long postId,
            @RequestBody Map<String, Object> body) {
        Long authorId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found")).getId();
        String title = body.get("title").toString();
        String description = body.get("description").toString();
        PostCategory category = PostCategory.valueOf(body.get("category").toString());
        Post post = contentService.updatePost(postId, authorId, title, description, category);
        return ResponseEntity.ok(postToMap(post));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<?> deletePost(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long postId) {
        Long authorId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found")).getId();
        contentService.deletePost(postId, authorId);
        return ResponseEntity.ok(Map.of("message", "Post deleted"));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<?> updateComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long commentId,
            @RequestBody Map<String, Object> body) {
        Long authorId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found")).getId();
        String content = body.get("content").toString();
        Comment comment = contentService.updateComment(commentId, authorId, content);
        return ResponseEntity.ok(commentToMap(comment));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long commentId) {
        Long authorId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found")).getId();
        contentService.deleteComment(commentId, authorId);
        return ResponseEntity.ok(Map.of("message", "Comment deleted"));
    }
}