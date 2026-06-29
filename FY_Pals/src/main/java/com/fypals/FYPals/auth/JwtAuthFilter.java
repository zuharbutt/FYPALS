package com.fypals.FYPals.auth;

import com.fypals.FYPals.user.repository.UserRepository;
import com.fypals.FYPals.user.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil              jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final UserRepository         userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        if (jwtUtil.isTokenValid(token)) {
            String email = jwtUtil.extractEmail(token);

            // Reject token if it was issued before the user's role was last changed
            java.util.Date issuedAt = jwtUtil.extractIssuedAt(token);
            boolean tokenStale = userRepository.findByEmail(email)
                    .map(u -> u.getRoleChangedAt())
                    .filter(changed -> issuedAt != null &&
                            issuedAt.toInstant().isBefore(changed.atZone(java.time.ZoneId.systemDefault()).toInstant()))
                    .isPresent();

            if (tokenStale) {
                // Token predates a role change — force re-login
                response.setStatus(401);
                return;
            }

            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        filterChain.doFilter(request, response);
    }
}