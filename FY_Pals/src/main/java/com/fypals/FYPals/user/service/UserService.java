package com.fypals.FYPals.user.service;

import com.fypals.FYPals.user.dto.ProfileResponse;
import com.fypals.FYPals.user.dto.ProfileUpdateRequest;
import com.fypals.FYPals.user.entity.*;
import com.fypals.FYPals.user.repository.UserRepository;
import com.fypals.FYPals.team.repository.TeamMemberRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository       userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final PasswordEncoder      passwordEncoder;

    public ProfileResponse getMyProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return toProfileResponse(user);
    }

    public ProfileResponse getProfileById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));
        return toProfileResponse(user);
    }

    public ProfileResponse getProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found with email: " + email));
        return toProfileResponse(user);
    }

    @Transactional
    public void changePassword(String email, String oldPassword, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
    }

    @Transactional
    public ProfileResponse updateMyProfile(String email, ProfileUpdateRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        user.setName(request.getName());
        user.setBio(request.getBio());
        user.setSkills(request.getSkills());

        if (user instanceof Student student) {
            student.setGpa(request.getGpa());
            student.setInterests(request.getInterests());
            student.setPastProjects(request.getPastProjects());
            // Student profile is complete when name, skills and interests are filled
            boolean complete = request.getName() != null && !request.getName().trim().isEmpty()
                    && request.getSkills() != null && !request.getSkills().trim().isEmpty()
                    && request.getInterests() != null && !request.getInterests().trim().isEmpty();
            user.setProfileComplete(complete);
        } else if (user instanceof Advisor advisor) {
            advisor.setDepartment(request.getDepartment());
            advisor.setResearchAreas(request.getResearchAreas());
            // Advisor profile is complete when name, skills, department and research areas are filled
            boolean complete = request.getName() != null && !request.getName().trim().isEmpty()
                    && request.getSkills() != null && !request.getSkills().trim().isEmpty()
                    && request.getDepartment() != null && !request.getDepartment().trim().isEmpty()
                    && request.getResearchAreas() != null && !request.getResearchAreas().trim().isEmpty();
            user.setProfileComplete(complete);
        } else if (user instanceof FYPStaff staff) {
            staff.setDesignation(request.getDesignation());
            // FYP Staff profile is complete when name is filled
            boolean complete = request.getName() != null && !request.getName().trim().isEmpty();
            user.setProfileComplete(complete);
        }

        userRepository.save(user);
        return toProfileResponse(user);
    }

    private ProfileResponse toProfileResponse(User user) {
        Long teamId = teamMemberRepository.findByUserId(user.getId())
                .stream()
                .filter(tm -> tm.getDropDate() == null)
                .findFirst()
                .map(tm -> tm.getTeam().getId())
                .orElse(null);

        ProfileResponse.ProfileResponseBuilder builder = ProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .bio(user.getBio())
                .skills(user.getSkills())
                .role(user.getRole())
                .profileComplete(user.isProfileComplete())
                .teamId(teamId);

        if (user instanceof Student s) {
            builder.gpa(s.getGpa())
                    .interests(s.getInterests())
                    .pastProjects(s.getPastProjects());
        } else if (user instanceof Advisor a) {
            builder.department(a.getDepartment())
                    .researchAreas(a.getResearchAreas());
        } else if (user instanceof FYPStaff f) {
            builder.designation(f.getDesignation());
        }

        return builder.build();
    }
}