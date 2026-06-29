package com.fypals.FYPals.user.repository;

import com.fypals.FYPals.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.fypals.FYPals.enums.Role;

public interface UserRepository extends JpaRepository<User, Long> {

    Page<User> findAll(Pageable pageable);

    /**
     * Original search — used by legacy code, searches title+description.
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(u.skills) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<User> searchByKeyword(@Param("keyword") String keyword);

    /**
     * FIX 8: Extended search that also matches bio and interests fields.
     * Used by SearchService to give broader, more helpful results.
     */
    @Query("SELECT u FROM User u WHERE " +
            "LOWER(u.name)      LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.skills)    LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.bio)       LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<User> searchByKeywordExtended(@Param("keyword") String keyword);

    List<User> findByRole(Role role);

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Modifying
    @Query(value = "UPDATE users SET dtype = :dtype, role = :dtype WHERE id = :id", nativeQuery = true)
    void updateDtype(@Param("id") Long id, @Param("dtype") String dtype);
}