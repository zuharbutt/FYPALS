package com.fypals.FYPals.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@DiscriminatorValue("FYP_STAFF")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
public class FYPStaff extends User {
    private String designation;
}
