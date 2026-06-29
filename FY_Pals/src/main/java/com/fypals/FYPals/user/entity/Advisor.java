package com.fypals.FYPals.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@DiscriminatorValue("ADVISOR")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
public class Advisor extends User {
    private String department;
    private String researchAreas;
}
