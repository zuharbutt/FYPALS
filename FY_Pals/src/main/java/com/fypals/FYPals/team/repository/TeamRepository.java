package com.fypals.FYPals.team.repository;

import com.fypals.FYPals.team.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {
    Page<Team> findAll(Pageable pageable);

    @Query("SELECT t FROM Team t WHERE t.leader.id = :leaderId")
    List<Team> findByLeaderId(@Param("leaderId") Long leaderId);

    boolean existsByTeamName(String teamName);
}