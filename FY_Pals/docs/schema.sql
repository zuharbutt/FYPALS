-- =============================================
-- FYPals Database Schema (Reference Only)
-- Hibernate auto-generates these from entities
-- =============================================

-- USERS (Single Table Inheritance)
-- dtype column differentiates: STUDENT, ADVISOR, FYP_STAFF, ADMIN
CREATE TABLE users (
    id            BIGINT IDENTITY PRIMARY KEY,
    dtype         VARCHAR(20) NOT NULL,         -- discriminator
    email         VARCHAR(255) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL,
    name          VARCHAR(255),
    bio           VARCHAR(1000),
    skills        VARCHAR(1000),
    profile_complete BIT DEFAULT 0,
    created_at    DATETIME2,

    -- Student-specific
    gpa           FLOAT,
    interests     VARCHAR(1000),
    past_projects VARCHAR(1000),

    -- Advisor-specific
    department    VARCHAR(255),
    research_areas VARCHAR(1000),

    -- FYPStaff-specific
    designation   VARCHAR(255)
);

-- TEAMS
CREATE TABLE teams (
    id          BIGINT IDENTITY PRIMARY KEY,
    team_name   VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'FORMING',
    leader_id   BIGINT REFERENCES users(id),
    created_at  DATETIME2
);

-- TEAM MEMBERS
CREATE TABLE team_members (
    id          BIGINT IDENTITY PRIMARY KEY,
    team_id     BIGINT REFERENCES teams(id),
    user_id     BIGINT REFERENCES users(id),
    member_role VARCHAR(20) NOT NULL,
    joined_date DATETIME2,
    drop_date   DATETIME2
);

-- POSTS
CREATE TABLE posts (
    id            BIGINT IDENTITY PRIMARY KEY,
    author_id     BIGINT REFERENCES users(id),
    title         VARCHAR(255) NOT NULL,
    description   VARCHAR(2000),
    category      VARCHAR(50),
    vote_count    INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at    DATETIME2
);

-- COMMENTS
CREATE TABLE comments (
    id         BIGINT IDENTITY PRIMARY KEY,
    post_id    BIGINT REFERENCES posts(id),
    author_id  BIGINT REFERENCES users(id),
    content    VARCHAR(2000) NOT NULL,
    created_at DATETIME2
);

-- VOTES
CREATE TABLE votes (
    id        BIGINT IDENTITY PRIMARY KEY,
    post_id   BIGINT REFERENCES posts(id),
    user_id   BIGINT REFERENCES users(id),
    vote_type VARCHAR(10) NOT NULL,
    UNIQUE (post_id, user_id)              -- one vote per user per post
);

-- PROJECTS
CREATE TABLE projects (
    id            BIGINT IDENTITY PRIMARY KEY,
    team_id       BIGINT UNIQUE REFERENCES teams(id),   -- one project per team
    description   VARCHAR(2000),
    status        VARCHAR(20) DEFAULT 'NOT_STARTED',
    supervisor_id BIGINT REFERENCES users(id),
    start_date    DATE,
    end_date      DATE
);

-- PHASES
CREATE TABLE phases (
    id         BIGINT IDENTITY PRIMARY KEY,
    project_id BIGINT REFERENCES projects(id),
    name       VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date   DATE
);

-- CHECKPOINTS
CREATE TABLE checkpoints (
    id            BIGINT IDENTITY PRIMARY KEY,
    phase_id      BIGINT REFERENCES phases(id),
    title         VARCHAR(255) NOT NULL,
    status        VARCHAR(20) DEFAULT 'TODO',
    assigned_to   BIGINT REFERENCES users(id),
    deadline      DATETIME2,
    created_at    DATETIME2
);

-- DELIVERABLES
CREATE TABLE deliverables (
    id                BIGINT IDENTITY PRIMARY KEY,
    project_id        BIGINT REFERENCES projects(id),
    title             VARCHAR(255) NOT NULL,
    deadline          DATETIME2,
    status            VARCHAR(30) DEFAULT 'PENDING',
    submitted_at      DATETIME2,
    google_drive_link VARCHAR(500),
    submitted_by      BIGINT REFERENCES users(id),
    reminder_sent     BIT DEFAULT 0
);

-- FEEDBACK
CREATE TABLE feedback (
    id             BIGINT IDENTITY PRIMARY KEY,
    deliverable_id BIGINT REFERENCES deliverables(id),
    reviewer_id    BIGINT REFERENCES users(id),
    comment        VARCHAR(2000),
    decision       VARCHAR(30),
    created_at     DATETIME2
);

-- CHAT ROOMS (one per team)
CREATE TABLE chat_rooms (
    id         BIGINT IDENTITY PRIMARY KEY,
    team_id    BIGINT UNIQUE REFERENCES teams(id),
    created_at DATETIME2
);

-- CHAT MESSAGES
CREATE TABLE chat_messages (
    id           BIGINT IDENTITY PRIMARY KEY,
    chat_room_id BIGINT REFERENCES chat_rooms(id),
    sender_id    BIGINT REFERENCES users(id),
    content      VARCHAR(2000),
    timestamp    DATETIME2,
    message_type VARCHAR(20) DEFAULT 'TEXT'
);

-- DISPUTES
CREATE TABLE disputes (
    id             BIGINT IDENTITY PRIMARY KEY,
    team_id        BIGINT REFERENCES teams(id),
    raised_by      BIGINT REFERENCES users(id),
    target_item    VARCHAR(500),
    reason         VARCHAR(2000),
    status         VARCHAR(20) DEFAULT 'PENDING',
    resolved_at    DATETIME2,
    created_at     DATETIME2
);

-- POLLS (linked to disputes)
CREATE TABLE polls (
    id          BIGINT IDENTITY PRIMARY KEY,
    dispute_id  BIGINT REFERENCES disputes(id),
    question    VARCHAR(500),
    created_by  BIGINT REFERENCES users(id)
);

-- POLL VOTES
CREATE TABLE poll_votes (
    id            BIGINT IDENTITY PRIMARY KEY,
    poll_id       BIGINT REFERENCES polls(id),
    voter_id      BIGINT REFERENCES users(id),
    chosen_option VARCHAR(255),
    UNIQUE (poll_id, voter_id)             -- one vote per user per poll
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id         BIGINT IDENTITY PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id),
    message    VARCHAR(1000),
    type       VARCHAR(30),
    is_read    BIT DEFAULT 0,
    created_at DATETIME2
);