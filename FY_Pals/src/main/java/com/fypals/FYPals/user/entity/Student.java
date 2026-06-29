package com.fypals.FYPals.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@DiscriminatorValue("STUDENT")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
public class Student extends User {
    private Double gpa;
    private String interests;
    private String pastProjects;
}
