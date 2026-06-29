package com.fypals.FYPals.progress.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "phases")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Phase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    private String name;

    private LocalDate startDate;

    private LocalDate endDate;

    // Links this phase permanently to a specific deliverable.
    // Null for phases created before this field was added (treated as belonging to active deliverable).
    @Column(name = "deliverable_id")
    private Long deliverableId;
}