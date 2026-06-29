// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'ADVISOR';
}

export interface AuthResponse {
  token: string;
  id: number;
  name: string;
  email: string;
  role: 'STUDENT' | 'ADVISOR' | 'ADMIN' | 'FYP_STAFF';
  profileComplete: boolean;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'STUDENT' | 'ADVISOR' | 'ADMIN' | 'FYP_STAFF';
  bio?: string;
  skills?: string;
  gpa?: number;
  interests?: string;
  pastProjects?: string;
  department?: string;
  profileComplete: boolean;
  createdAt?: string;
  teamId?: number;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  skills?: string;
  gpa?: number;
  interests?: string;
  pastProjects?: string;
  department?: string;
}

// ─── Team ────────────────────────────────────────────────────────────────────

export type TeamStatus = 'FORMING' | 'ACTIVE' | 'COMPLETED' | 'DISSOLVED';
export type MemberRole = 'LEADER' | 'MEMBER' | 'ADVISOR';

export interface TeamMember {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  memberRole: MemberRole;
  joinedDate?: string;
}

export interface Team {
  id: number;
  teamName: string;
  status: TeamStatus;
  leaderId: number;
  leaderName: string;
  members: TeamMember[];
  project?: Project;
  createdAt?: string;
}

// ─── Post ────────────────────────────────────────────────────────────────────

export type PostCategory =
    | 'LOOKING_FOR_MEMBER'
    | 'LOOKING_FOR_ADVISOR'
    | 'PROJECT_IDEA'
    | 'REQUIREMENT'
    | 'GENERAL';

export interface Post {
  id: number;
  authorId: number;
  authorName: string;
  title: string;
  description: string;
  category: PostCategory;
  voteCount: number;
  upvoteCount?: number;
  downvoteCount?: number;
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export type CheckpointStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETE';

export interface Checkpoint {
  id: number;
  phaseId: number;
  title: string;
  status: CheckpointStatus;
  assignedToId?: number;
  assignedToName?: string;
  deadline?: string;
  createdAt?: string;
}

export interface Phase {
  id: number;
  projectId: number;
  name: string;
  startDate: string;
  endDate: string;
  checkpoints: Checkpoint[];
}

export interface ProjectProgress {
  projectId: number;
  completionPercent: number;
  totalCheckpoints: number;
  completedCheckpoints: number;
  phases: Phase[];
}

// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';

export interface Project {
  id: number;
  teamId: number;
  projectName?: string;
  description?: string;
  status: ProjectStatus;
  supervisorId?: number;
  startDate?: string;
  endDate?: string;
  completionPercentage?: number;
}

// ─── Deliverable ─────────────────────────────────────────────────────────────

export type DeliverableStatus =
    | 'PENDING'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'CHANGES_REQUESTED';

export type FeedbackDecision = 'APPROVED' | 'CHANGES_REQUESTED';

export interface Feedback {
  id: number;
  deliverableId: number;
  reviewerId: number;
  reviewerName: string;
  comment: string;
  decision: FeedbackDecision;
  createdAt: string;
}

export interface Deliverable {
  id: number;
  projectId: number;
  title: string;
  deadline: string;
  status: DeliverableStatus;
  submittedAt?: string;
  googleDriveLink?: string;
  submittedById?: number;
  feedback?: Feedback;
}

// ─── Dispute & Poll ──────────────────────────────────────────────────────────

export type DisputeStatus = 'PENDING' | 'OPEN' | 'RESOLVED' | 'REJECTED';

export interface Poll {
  id: number;
  disputeId: number;
  question: string;
  options: string[];
  deadline?: string;
  createdById: number;
  results?: PollResult[];
}

export interface PollResult {
  option: string;
  count: number;
  percent: number;
}

export interface PollVote {
  pollId: number;
  chosenOption: string;
}

export interface Dispute {
  id: number;
  teamId: number;
  raisedById: number;
  raisedByName: string;
  targetItem: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string;
  poll?: Poll;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
    | 'TEAM_INVITE'
    | 'ADVISOR_INVITE'        // ← ADDED: advisor supervision invite
    | 'INVITE_ACCEPTED'
    | 'INVITE_DECLINED'
    | 'MEMBER_DROPPED'
    | 'TEAM_DROPPED'
    | 'DISPUTE_RAISED'
    | 'DISPUTE_ACCEPTED'
    | 'DISPUTE_REJECTED'
    | 'DISPUTE_RESOLVED'
    | 'DELIVERABLE_SUBMITTED'
    | 'DELIVERABLE_FEEDBACK'
    | 'DEADLINE_REMINDER'
    | 'COMMENT'
    | 'GENERAL';

export interface Notification {
  id: number;
  userId: number;
  message: string;
  type: NotificationType;
  read: boolean;
  referenceId?: number;
  createdAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id?: number;
  teamId: number;
  senderId: number;
  senderName: string;
  content: string;
  messageType: 'TEXT' | 'DISPUTE_REQUEST' | 'POLL';
  timestamp?: string;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export type SearchResultType = 'post' | 'student' | 'advisor' | 'project';

export interface SearchResult {
  id: number;
  type: SearchResultType;
  title: string;
  description?: string;
  extra?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

// ─── API wrapper ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}