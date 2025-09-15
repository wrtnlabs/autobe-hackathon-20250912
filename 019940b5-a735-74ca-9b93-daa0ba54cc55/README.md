# AutoBe Hackathon 2025 Session

## Outline

Generation Result of AutoBe Hackathon 2025 participant.

- id: [019940b5-a735-74ca-9b93-daa0ba54cc55](./019940b5-a735-74ca-9b93-daa0ba54cc55)
      - participant: Rishyanth Reddy M(rishyanthreddy101@gmail.com)
      - model: `openai/gpt-4.1-mini`
      - phase: `realize`
      - title: Event Management
- review: https://github.com/wrtnlabs/autobe/discussions/601#discussion-8888810

## User Message

Create an Event Registration platform where:
- Users register with email/password (store email verification status as boolean)
- Event organizers can create events with details (name, date, location, capacity)
- Users can sign up for events with automatic waitlist when full
- Organizers can view attendee lists and manage events

Mock Email System (no real email sending):
- User registration creates unverified account (email_verified: false)
- Include a /verify-email/{token} endpoint that simulates email confirmation
- System generates verification tokens and stores them in database
- Manual verification via API call or admin interface
- Users can only sign up for events after email verification

Advanced features:
- Dynamic capacity adjustment based on sign-up trends
- Automatic waitlist promotion when spots open
- Simple notification logs (instead of real emails) stored in database
- Analytics on sign-up patterns and popular events

## Assistant Message

Thank you for sharing your requirements for the Event Registration platform. To make sure I fully capture all your needs, I would like to clarify and gather some more details.

Here’s what I understand so far:
- User registration with email/password and email verification.
- Event organizers can create and manage events (with name, date, location, capacity).
- Users can sign up for events; when events are full, users are placed on a waitlist.
- Organizers can view attendee lists and manage their events.
- Email verification is simulated with tokens and a verification endpoint; users can't sign up for events unless verified.
- Dynamic capacity adjustment based on sign-up trends.
- Automatic promotion from waitlist when space becomes available.
- Notifications logged in the system (no real emails).
- Analytics on sign-up patterns and event popularity.

To proceed with designing the system, I have some questions to flesh out detailed requirements:

1. User Roles & Permissions:
   - Are there just two roles: regular users and event organizers? Or do admins exist with special privileges (e.g., managing users or events globally)?
   - Can users become organizers by themselves, or does an admin assign organizer roles?

2. User Profiles:
   - Besides email and verification status, do you want to store other profile info (name, phone, etc.)?

3. Event Details:
   - Any additional details needed beyond name, date, location, and capacity? For example, description, ticket price, categories?

4. Event Capacity & Waitlist:
   - How do you envision dynamic capacity adjustment? For example, scaling capacity up/down automatically based on demand metrics?
   - When a spot frees up, should the top user on the waitlist be automatically registered and notified?

5. Notifications:
   - What kinds of notifications should be logged? Registration confirmations, waitlist promotions, event changes?
   - Should users/organizers be able to view their notification logs in the system?

6. Analytics:
   - What specific analytics are important? Total sign-ups per event, peak registration times, waitlist trends?
   - Should analytics be viewable by organizers only for their events, or globally?

7. APIs & Interfaces:
   - Besides the /verify-email/{token} endpoint, would you want other public APIs (e.g., for event browsing, user management)?
   - Any preference for admin or organizer interface for managing events and users?

Answering these will help me create a solid requirements specification before proceeding. Please let me know if you'd like me to continue with any assumptions or if you have additional features in mind!

## User Message

1. User Roles & Permissions: Three roles: Regular Users, Event Organizers, and Admins. Admins have global privileges to manage users and events system-wide. Users can request organizer status through the platform, but admin approval is required to prevent spam event creation. 2. User Profiles: Store additional info: Full name, phone number, and profile picture URL. Keep it focused on essential contact information needed for event communication and identification. 3. Event Details: Additional fields needed: Event description, ticket price (can be $0 for free events), event categories (workshop, seminar, social, networking), and event status (scheduled, cancelled, completed). This adds business logic complexity for AutoBE to handle. 4. Event Capacity & Waitlist: Dynamic capacity logic: Automatically increase capacity by 10% if waitlist reaches 50% of current capacity, decrease by 10% if waitlist drops below 10% of capacity. Admins can override these automatic adjustments. Waitlist promotion: When someone cancels, automatically register the top waitlisted user and log a notification. 5. Notifications: Log these notification types: Registration confirmations, waitlist promotions, event schedule changes, and capacity adjustments. Users and organizers can view their notification history through their profile dashboard - this tests AutoBE's ability to handle user-specific data views. 6. Analytics: Track these metrics: Total sign-ups per event, peak registration times, waitlist length trends, and event popularity by category. Access scope: Organizers see analytics only for their own events, admins see global analytics across all events. This tests role-based data filtering. 7. APIs & Interfaces: Public APIs needed: /verify-email/{token}, /events (browse events), /users/{id} (profile management), /events/{id}/signups (registration management). Interfaces: Admin dashboard for global management, organizer dashboard for managing their own events and viewing attendee lists. Now Please proceed with requirement analysis Phase

## Analyze

### Roles

Name | Kind | Description
-----|------|--------------
regularUser | member | Regular users who can register with email/password, verify email, browse events, and sign up for events after verification. They can request organizer status but cannot create or manage events by default. 
eventOrganizer | member | Users with permissions to create, update, cancel, and manage their own events. Organizers can view attendee lists, manage waitlists, and see analytics for their events. Organizer status must be approved by admins. 
admin | admin | Admins have global privileges to manage users, approve organizer requests, manage all events system-wide, override capacity adjustments, and view global analytics. They also handle manual email verifications and system-level notifications. 

### Documents

- 01-service-overview.md
- 02-user-roles-and-authentication.md
- 03-functional-requirements.md
- 04-user-scenarios.md
- 05-business-rules-and-constraints.md
- 06-system-context.md
- 07-security-and-compliance.md
- 08-api-and-interface-specifications.md
- 09-analytics-and-reporting.md
- 00-toc.md

## User Message

Now let's go with database design

## Prisma

- success: true
- namespaces: 7
- tables: 12

## User Message

let's go with API Interface Phase

## Interface

- operations: 133
- schemas: 89

## User Message

Let's go for E2E Testing!

## Test

- functions: 153
- success: true

## User Message

Try to fix all the issues and make sure all test cases passes

## Realize

- functions: 133
- success: false