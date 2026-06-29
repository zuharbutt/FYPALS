package com.fypals.FYPals.auth;

import com.fypals.FYPals.auth.dto.*;
import com.fypals.FYPals.enums.Role;
import com.fypals.FYPals.user.entity.*;
import com.fypals.FYPals.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        User user = buildUserByRole(request);
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(user.getId(), user.getName(), token,
                user.getEmail(), user.getRole().name());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(user.getId(), user.getName(), token,
                user.getEmail(), user.getRole().name());
    }

    private User buildUserByRole(RegisterRequest req) {
        String hashed = passwordEncoder.encode(req.getPassword());

        return switch (req.getRole()) {
            case STUDENT -> {
                Student s = new Student();
                s.setEmail(req.getEmail());
                s.setPassword(hashed);
                s.setName(req.getName());
                s.setRole(Role.STUDENT);
                // Students must fill GPA/skills before profileComplete=true
                s.setProfileComplete(false);
                yield s;
            }
            case ADVISOR -> {
                Advisor a = new Advisor();
                a.setEmail(req.getEmail());
                a.setPassword(hashed);
                a.setName(req.getName());
                a.setRole(Role.ADVISOR);
                // Advisors should fill department/research areas
                a.setProfileComplete(false);
                yield a;
            }
            case FYP_STAFF -> {
                FYPStaff f = new FYPStaff();
                f.setEmail(req.getEmail());
                f.setPassword(hashed);
                f.setName(req.getName());
                f.setRole(Role.FYP_STAFF);
                // FYP Staff should fill designation — starts incomplete
                f.setProfileComplete(false);
                yield f;
            }
            case ADMIN -> {
                Admin ad = new Admin();
                ad.setEmail(req.getEmail());
                ad.setPassword(hashed);
                ad.setName(req.getName());
                ad.setRole(Role.ADMIN);
                // Admins manage the system — their profile is complete by default
                ad.setProfileComplete(true);
                yield ad;
            }
        };
    }

    /**
     * Refreshes the JWT token.
     * Uses extractEmailIgnoreExpiry() so an expired-but-valid-signature token
     * can still be used to issue a new one — the frontend calls this when it
     * gets a 401, so the old token will often already be expired.
     */
    public AuthResponse refreshToken(String oldToken) {
        String email = jwtUtil.extractEmailIgnoreExpiry(oldToken);
        if (email == null) {
            throw new RuntimeException("Invalid token — cannot refresh");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Reject refresh if token was issued before password/role change
        java.util.Date issuedAt = jwtUtil.extractIssuedAt(oldToken);
        if (issuedAt != null && user.getRoleChangedAt() != null) {
            java.time.Instant tokenInstant = issuedAt.toInstant();
            java.time.Instant changedInstant = user.getRoleChangedAt()
                    .atZone(java.time.ZoneId.systemDefault()).toInstant();
            if (tokenInstant.isBefore(changedInstant)) {
                throw new RuntimeException("Token invalidated — please log in again");
            }
        }

        String newToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(user.getId(), user.getName(), newToken,
                user.getEmail(), user.getRole().name());
    }
}