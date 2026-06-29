# 🎓 FYPals — Final Year Project Management & Collaboration Platform

**FYPals** is a comprehensive, web-based platform designed to streamline the Final Year Project (FYP) cycle for students, advisors, FYP coordinators (staff), and administrators. It combines project tracking, team collaboration, peer discussions, and supervisor coordination into a single, intuitive system.

---

## 🌟 High-Level Features

### 👤 Role-Based Portals & Dashboards
* **Admin Portal**: System-wide user creation, role changes, and system configuration.
* **FYP Staff Portal**: Manage deliverables, set milestones, track project progress across the department, and handle dispute resolutions.
* **Advisor (Supervisor) Portal**: Dashboard for advisors to supervise assigned teams, review/approve submissions, and provide milestone feedback.
* **Student Dashboard**: Form teams, invite members, view deadlines, track project completion progress, submit deliverables, and participate in peer discussions.

### 👥 Team & Project Management
* **Dynamic Team Formation**: Students can create teams (becoming the Team Leader) and invite other student members.
* **Advisor Supervision**: Staff or students can invite advisors, who are then linked to the team project as the Supervisor.
* **Status Workflows**: Teams progress through forming, active, locked, or dissolved states based on membership and supervisor assignments.

### 📅 Deliverables & Automated Email Reminders
* **Deliverable Submissions**: Staff define deliverables (e.g., Proposal, SRS, Interim Report) with strict deadlines.
* **Advisor Approvals**: Supervisors review submissions and mark them as PENDING, SUBMITTED, or APPROVED.
* **Automated Reminders**: A background job (`DeadlineReminderJob`) runs daily at 8:00 AM, automatically emailing all team members and their advisor if a deliverable is due the following day.

### 💬 Collaboration & Dispute Resolution
* **Peer Learning Forum**: Discussion board supporting categories, comments, and post voting (upvote/downvote).
* **Workspace Chat**: Real-time team-wide chat for project coordination.
* **Dispute Resolution Polls**: Internal voting system to resolve internal team disputes fairly and transparently.

### 🔍 Discovery & Profiles
* **Student/Advisor Search**: Find peers based on skills, bios, interests, or departments to form teams or seek supervisors.
* **Profile Management**: Profile completion workspace to showcase interest areas and skills.

---

## 🛠️ Tech Stack
* **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, React State Management.
* **Backend**: Spring Boot 3.5+, Hibernate JPA, Spring Security, Spring Mail (SMTP).
* **Database**: Microsoft SQL Server.

---

## 🚀 Installation & Setup Guide

### 📋 Prerequisites
Ensure you have the following installed:
* **Java Development Kit (JDK)**: Version 17 or higher.
* **Node.js**: Version 18 or higher (with `npm`).
* **Maven**: Version 3.x (or use the included Maven wrapper `./mvnw`).
* **Microsoft SQL Server**: Local instance running on port `1433`.

---

### 🗄️ 1. Database Setup
1. Open your SQL Server management client (e.g., SSMS, Azure Data Studio, or DBeaver).
2. Connect to your local instance (`localhost:1433`).
3. Run the following command to create the database:
   ```sql
   CREATE DATABASE fypals;
   ```
4. Verify that the credentials in `FY_Pals/src/main/resources/application.properties` (username `sa`, password `Admin1234!`) match your local SQL Server credentials. If your database connection settings are different, you can customize them locally.

---

### 📧 2. Email SMTP Setup (Optional / Highly Recommended)
To enable the automated deadline email notifications:
1. In [FY_Pals/src/main/resources/](file:///c:/Users/Faisal%20Butt/IdeaProjects/FYPals/FY_Pals/src/main/resources/), create a file named `application-local.properties`.
2. Add your Gmail credentials to it (this file is git-ignored and safe from being committed):
   ```properties
   spring.mail.username=your-email@gmail.com
   spring.mail.password=your-gmail-app-password
   ```
   *(Note: Gmail requires an **App Password** generated from your Google Account settings, rather than your actual account password).*

---

### ☕ 3. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd FY_Pals
   ```
2. Build the project and download all Maven dependencies:
   ```bash
   mvn clean install
   ```
3. Run the database seeder test to wipe any previous data and insert fresh test accounts, teams, and projects:
   ```bash
   mvn test -Dtest=DatabaseSeederTest
   ```
4. Run the Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```
   The backend server will start and listen on `http://localhost:8080`.

---

### 💻 4. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables. Ensure the file `.env.local` contains:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` to access the application.

---

## 🔑 Login Credentials

The database seeder initializes the database with a clean set of test accounts across all roles. Use the credentials below to log in:

| User Role | Email address | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@gmail.com` | `Password@123` | Can change roles and manage users |
| **FYP Staff** | `fypstaff1@gmail.com` | `Password@123` | FYP Coordinator |
| **FYP Staff** | `fypstaff2@gmail.com` | `Password@123` | Assistant Coordinator |
| **Student** | `student1@gmail.com` | `Password@123` | Leader of **Alpha Team** |
| **Student** | `student2@gmail.com` | `Password@123` | Leader of **Beta Team** |
| **Advisor** | `advisor1@gmail.com` | `Password@123` | Supervisor of **Alpha Team** |
| **Advisor** | `advisor2@gmail.com` | `Password@123` | Supervisor of **Beta Team** |
