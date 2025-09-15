## Business Model

### Why This Service Exists

Modern hiring processes rely heavily on manual operations: HR recruiters spend hours sifting through hundreds of unstructured resumes, scheduling interviews via email chains, and tracking candidate statuses across spreadsheets. This fragmentation leads to slow decision-making, inconsistent evaluations, missed candidates due to human error, and poor candidate experiences. The ATS (Applicant Tracking System) eliminates this inefficiency by automating workflow stages from resume ingestion to interview scheduling and status notifications, providing a centralized, auditable, and scalable platform for technical hiring.

The platform specifically addresses the unique needs of engineering teams that evaluate candidates on technical competencies, not just academic credentials. By integrating automated skill extraction, coding test automation, and AI-driven interview question generation, this system reduces bias in resume screening and ensures objective, repeatable evaluation criteria—something manually managed systems cannot reliably achieve.

Competitors such as Greenhouse and Lever provide general HR solutions but lack deep integration with technical hiring workflows such as automated code assessment scoring and recruiter-reviewer collaboration. This ATS fills that gap by being purpose-built for engineering hiring pipelines where technical aptitude is non-negotiable.

### Revenue Strategy

This system is designed as an enterprise SaaS product for technology companies with 50+ engineers. Revenue is generated through:

- **Monthly subscription tiers** based on number of active job postings and users
- **Premium features**: AI interview question recommendation and advanced candidate ranking
- **Custom integration fees** for enterprise-wide SSO or HRIS synchronization

Initial adoption will target mid-size tech firms (100–500 employees) who experience high-volume engineering recruitment (50–200 applications per job posting) and need measurable reduction in time-to-hire.

### Growth Plan

1. **User Acquisition**: Target engineering managers and HR directors via LinkedIn campaigns, tech meetups, and word-of-mouth from early adopters.
2. **Retention Strategy**: Ensure a 90%+ candidate completion rate for applications and automated notifications to improve system trust.
3. **Expansion Path**: Seed feedback from early users to add multilingual resume parsing (Q3 2026), diversity analytics dashboards (Q4 2026), and API access for legacy HR systems (Q1 2027).

### Success Metrics

The success of this ATS system will be measured by the following KPIs:

- **Time-to-Hire Reduction**: From an industry average of 38 days to under 21 days
- **Application Completion Rate**: 85% of applicants who start must complete resume upload and profile setup
- **Interview-to-Offer Ratio**: 40% of candidates who reach interview stage must receive an offer (higher than industry average of 25%)
- **HR Recruiter Utilization**: Reduce manual resume review time by 70% (from 15 minutes/resume to under 5 minutes)
- **System Adoption Rate**: 95% of internal recruiters must use the ATS as their primary hiring tool within 90 days of rollout
- **Candidate Satisfaction Score (CSAT)**: Minimum average score of 4.3/5 on post-application surveys

## Core Value Proposition

The ATS provides a unified platform that connects every stakeholder in the engineering hiring process—recruiters, candidates, reviewers, and administrators—into a seamless workflow. Unlike email-based or spreadsheet-driven methods, this system ensures:

- **Consistency**: Every candidate is evaluated against the same technical and behavioral criteria
- **Speed**: Resume parsing, skill matching, and interview scheduling happen in minutes, not days
- **Accountability**: Every action (status change, feedback note, interview decision) is logged and auditable
- **Insight**: AI-driven suggestions surface overlooked talent and prevent unconscious bias in initial screening
- **Integration**: Connection to Google Calendar eliminates double-booking and reduces no-shows by 30%

## Target Users

This system serves four distinct roles, each with unique workflows:

1. **HR Recruiter**
   - Manages active job postings and application pipelines
   - Reviews resumes extracted from PDF/Word uploads
   - Initiates coding tests and schedules interviews
   - Tracks candidate status transitions (e.g., "Submitted" → "Coding Test Passed" → "Interview Scheduled")
   - Exports candidate lists to CSV/Excel for leadership reporting

2. **Applicant**
   - Registers and logs into a personal portal
   - Uploads resumes in PDF or Word format
   - Browses active job postings by department, location, and tech stack
   - Views their own interview schedule and receives automated notifications
   - Does not see other applicants’ data or internal feedback

3. **Technical Reviewer**
   - Receives alerts when a candidate submits a completed coding test
   - Reviews automated scoring results and handwritten explanations
   - Rates technical skills against a predefined matrix (e.g., Node.js, AWS, SQL)
   - Has no access to scheduling, emails, or resume content unless explicitly linked to a candidate they are reviewing

4. **System Admin**
   - Configures system-wide settings (e.g., email templates, interview question banks)
   - Manages user accounts and role assignments (including password resets and deactivations)
   - Integrates and maintains external services such as Google Calendar and notification gateways
   - Monitors system health, export job statuses, and audit logs
   - Has full access to all data and can override most business rules

## Market Position

This ATS occupies a niche in the technical recruitment market by being **engineering-first**. While general HR platforms prioritize compliance and HR process automation, this system prioritizes:

- Automated evaluation of technical skill (not just keywords)
- Bi-directional integration with coding assessment platforms
- Collaborative feedback between recruiter and technical reviewer
- Job postings that mirror actual engineering role requirements (e.g., "Must have 3+ years of Terraform experience")

It appeals to companies that treat engineering hiring as a core competency—not a HR task. Its strategic advantage is **accuracy**: by pairing AI-powered skill extraction with human reviewer validation, it reduces false positives and negatives in candidate selection.

## Integration Requirements

This system must integrate with external services to function effectively:

- **Google Calendar**: The system SHALL create, update, and delete calendar events for scheduled interviews based on recruiter and candidate availability. Events SHALL include candidate name, interview role (e.g., "Technical Screening"), and a join link. Calendar sync failures shall trigger an automated email notification to the recruiter.

- **Email Messaging Gateway**: The system SHALL send automated emails via an external SMTP or third-party provider (e.g., SendGrid). Email content SHALL be templated based on status triggers, including:
  - Resume received confirmation
  - Coding test invitation
  - Interview reminder (24 hours before)
  - Offer letter and rejection notices

- **Resume Parsing Engine**: The system SHALL support parsing of DOCX and PDF files to extract name, email, phone number, education history, work experience, and technical skills. This process SHALL occur automatically upon upload.

## Non-Functional Expectations

- **Response Time**: All user-facing interfaces SHALL load within 2 seconds under normal load (100 concurrent users)
- **System Availability**: The system SHALL be available 99.9% of business hours (9 AM–6 PM KST, Monday–Friday)
- **Data Export Performance**: CSV/Excel exports involving 500+ candidates SHALL complete within 5 minutes
- **Notification Delay**: Email and SMS notifications SHALL be sent within 1 minute of triggering event
- **Concurrency**: The system SHALL support up to 500 simultaneous uploads of resumes without degradation

## Vision and Mission

**Vision**: To become the most trusted technical hiring platform for engineering teams by eliminating subjective screening and accelerating the match between talent and opportunity.

**Mission**: To automate administrative hiring tasks so that human experts can focus on evaluating technical fit and cultural alignment, not paperwork.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*