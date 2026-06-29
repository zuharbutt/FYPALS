package com.fypals.FYPals.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String email, String role) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** Extracts email from a valid (non-expired) token. Returns null if invalid. */
    public String extractEmail(String token) {
        try {
            return getClaims(token).getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Extracts email even from an EXPIRED token, as long as the signature is valid.
     * Used by the refresh flow — the frontend sends its expired access token to get a new one.
     * Returns null if the token signature is invalid (i.e. tampered).
     */
    public String extractEmailIgnoreExpiry(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
        } catch (ExpiredJwtException e) {
            // Expired but signature was valid — safe to trust the subject
            return e.getClaims().getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            // Tampered or garbage token
            return null;
        }
    }

    /** Extracts the issuedAt date from a valid token. Returns null if invalid. */
    public java.util.Date extractIssuedAt(String token) {
        try {
            return getClaims(token).getIssuedAt();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}