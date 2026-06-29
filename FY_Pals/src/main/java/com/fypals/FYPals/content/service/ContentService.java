package com.fypals.FYPals.content.service;

import com.fypals.FYPals.notification.service.NotificationService;
import com.fypals.FYPals.content.entity.Post;
import com.fypals.FYPals.content.entity.Comment;
import com.fypals.FYPals.content.entity.Vote;
import com.fypals.FYPals.content.repository.PostRepository;
import com.fypals.FYPals.content.repository.CommentRepository;
import com.fypals.FYPals.content.repository.VoteRepository;
import com.fypals.FYPals.enums.PostCategory;
import com.fypals.FYPals.enums.VoteType;
import com.fypals.FYPals.user.entity.User;
import com.fypals.FYPals.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
public class ContentService {

    @Autowired private PostRepository       postRepository;
    @Autowired private CommentRepository    commentRepository;
    @Autowired private VoteRepository       voteRepository;
    @Autowired private NotificationService  notificationService;
    @Autowired private UserRepository       userRepository;

    @Transactional
    public Post createPost(Long authorId, String title, String description, PostCategory category) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty");
        }
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Description cannot be empty");
        }
        Post post = new Post(authorId, title.trim(), description.trim(), category);
        return postRepository.save(post);
    }

    public Page<Post> getAllPosts(int page, int size, String sortBy) {
        Pageable pageable;
        if ("votes".equals(sortBy)) {
            pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "voteCount"));
        } else {
            pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        }
        return postRepository.findAll(pageable);
    }

    public Page<Post> getPostsByCategory(PostCategory category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return postRepository.findByCategory(category, pageable);
    }

    public Post getPost(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
    }

    @Transactional
    public Comment addComment(Long postId, Long authorId, String content) {
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Comment cannot be empty");
        }
        Post post = getPost(postId);

        // Get commenter's name for the notification message
        String commenterName = userRepository.findById(authorId)
                .map(User::getName)
                .orElse("Someone");

        Comment comment = new Comment(postId, authorId, content.trim());
        Comment savedComment = commentRepository.save(comment);

        post.setCommentCount((int) commentRepository.countByPostId(postId));
        postRepository.save(post);

        // Notify post author (but not if they're commenting on their own post)
        if (!post.getAuthorId().equals(authorId)) {
            notificationService.sendNotification(
                    post.getAuthorId(),
                    commenterName + " commented on your post: \"" + post.getTitle() + "\"",
                    "COMMENT",
                    postId
            );
        }

        return savedComment;
    }

    public List<Comment> getCommentsByPost(Long postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
    }

    @Transactional
    public Post voteOnPost(Long postId, Long userId, VoteType voteType) {
        Post post = getPost(postId);
        Optional<Vote> existingVote = voteRepository.findByPostIdAndUserId(postId, userId);

        if (existingVote.isPresent()) {
            Vote vote = existingVote.get();
            if (vote.getVoteType() == voteType) {
                voteRepository.delete(vote);
            } else {
                vote.setVoteType(voteType);
                voteRepository.save(vote);
            }
        } else {
            voteRepository.save(new Vote(postId, userId, voteType));
        }

        int upvotes   = voteRepository.countByPostIdAndVoteType(postId, VoteType.UPVOTE);
        int downvotes = voteRepository.countByPostIdAndVoteType(postId, VoteType.DOWNVOTE);
        post.setVoteCount(upvotes - downvotes);
        return postRepository.save(post);
    }

    public int getUpvoteCount(Long postId) {
        return voteRepository.countByPostIdAndVoteType(postId, VoteType.UPVOTE);
    }

    public int getDownvoteCount(Long postId) {
        return voteRepository.countByPostIdAndVoteType(postId, VoteType.DOWNVOTE);
    }

    @Transactional
    public Post updatePost(Long postId, Long authorId, String title, String description, PostCategory category) {
        Post post = getPost(postId);
        if (!post.getAuthorId().equals(authorId)) {
            throw new RuntimeException("Only the author can update this post");
        }
        post.setTitle(title);
        post.setDescription(description);
        post.setCategory(category);
        return postRepository.save(post);
    }

    @Transactional
    public void deletePost(Long postId, Long authorId) {
        Post post = getPost(postId);
        if (!post.getAuthorId().equals(authorId)) {
            throw new RuntimeException("Only the author can delete this post");
        }
        voteRepository.deleteByPostId(postId);
        commentRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    @Transactional
    public Comment updateComment(Long commentId, Long authorId, String content) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        if (!comment.getAuthorId().equals(authorId)) {
            throw new RuntimeException("Only the author can update this comment");
        }
        comment.setContent(content);
        return commentRepository.save(comment);
    }

    @Transactional
    public void deleteComment(Long commentId, Long authorId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        if (!comment.getAuthorId().equals(authorId)) {
            throw new RuntimeException("Only the author can delete this comment");
        }
        Long postId = comment.getPostId();
        commentRepository.delete(comment);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        post.setCommentCount((int) commentRepository.countByPostId(postId));
        postRepository.save(post);
    }
}