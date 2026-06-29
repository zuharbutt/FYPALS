# FYPals Backend — Frontend Integration Guide

## Base URL
http://localhost:8080

## Authentication
All protected endpoints require a JWT token in the Authorization header:
Authorization: Bearer <token>

### Login
POST /auth/login
Body: { "email": "user@example.com", "password": "password123" }
Response: { "token": "...", "email": "...", "role": "STUDENT" }

### Register
POST /auth/register
Body: { "email": "...", "password": "...", "name": "...", "role": "STUDENT|ADVISOR|ADMIN" }

### Refresh Token
POST /auth/refresh
Body: { "token": "<current_token>" }
Response: { "token": "...", "email": "...", "role": "..." }

## API Response Shape
All list/detail endpoints return data directly or wrapped in `{ data: ..., message: ... }` for dispute/poll endpoints.

## Endpoints Reference

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | /auth/register | No | Register user |
| POST | /auth/login | No | Login |
| POST | /auth/refresh | No | Refresh token |
| GET | /users/me/profile | Yes | Get own profile |
| PUT | /users/me/profile | Yes | Update profile |
| GET | /users/{id}/profile | Yes | View any profile |
| POST | /teams | Yes | Form a team |
| GET | /teams/{id} | Yes | Get team details |
| POST | /teams/{id}/invite-student | Yes | Invite student |
| POST | /teams/{id}/invites/{notifId}/accept | Yes | Accept invite |
| POST | /teams/{id}/invites/{notifId}/decline | Yes | Decline invite |
| DELETE | /teams/{id}/members/{userId} | Yes | Drop member |
| GET | /notifications | Yes | Get notifications |
| PUT | /notifications/{id}/read | Yes | Mark as read |
| POST | /posts | Yes | Create post |
| GET | /posts | Yes | List posts (paginated) |
| GET | /posts/{id} | Yes | Get post |
| PUT | /posts/{id} | Yes | Update post |
| DELETE | /posts/{id} | Yes | Delete post |
| POST | /posts/{id}/comments | Yes | Add comment |
| GET | /posts/{id}/comments | Yes | Get comments |
| PUT | /posts/comments/{id} | Yes | Update comment |
| DELETE | /posts/comments/{id} | Yes | Delete comment |
| POST | /posts/{id}/vote | Yes | Vote on post |
| GET | /search | Yes | Search (q, type) |
| POST | /disputes | Yes | Raise dispute |
| GET | /disputes/team/{id}/pending | Yes | Pending disputes |
| GET | /disputes/{id} | Yes | Get dispute |
| POST | /disputes/{id}/accept | Yes | Accept + create poll |
| POST | /disputes/{id}/reject | Yes | Reject dispute |
| GET | /disputes/{id}/poll | Yes | Get poll |
| POST | /disputes/{id}/polls/{pollId}/vote | Yes | Vote on poll |
| GET | /disputes/{id}/polls/{pollId}/results | Yes | Poll results |
| GET | /projects/{id}/progress | Yes | Project progress |
| POST | /projects/{id}/phases | Yes | Add phase |
| GET | /projects/{id}/phases | Yes | List phases |
| POST | /phases/{id}/checkpoints | Yes | Add checkpoint |
| GET | /phases/{id}/checkpoints | Yes | List checkpoints |
| PUT | /checkpoints/{id}/status | Yes | Update status |
| GET | /deliverables | Yes | List deliverables |
| POST | /deliverables/{id}/submit | Yes | Submit deliverable |
| POST | /deliverables/{id}/feedback | Yes | Give feedback |
| GET | /admin/users | ADMIN | All users |
| GET | /admin/teams | ADMIN | All teams |
| GET | /admin/posts | ADMIN | All posts |

## WebSocket Chat
Install: `npm install sockjs-client @stomp/stompjs`

```javascript
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const token = localStorage.getItem('token');
const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
  connectHeaders: { Authorization: `Bearer ${token}` },
  onConnect: () => {
    // Subscribe to team chat
    client.subscribe(`/topic/team/${teamId}`, (msg) => {
      const message = JSON.parse(msg.body);
      console.log('New message:', message);
    });
  }
});
client.activate();

// Send a message
client.publish({
  destination: '/app/chat.send',
  body: JSON.stringify({
    teamId: 1,
    senderId: userId,
    senderName: 'Zuhar',
    content: 'Hello team!',
    messageType: 'TEXT'
  })
});
```