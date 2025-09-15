# Chatbot Server Functional Requirements Analysis

## 1. Introduction
This document defines the comprehensive business and functional requirements for the chatbot server to guide backend developers in implementing a multi-room chatbot system with points, minigames, and admin controls.

## 2. Business Model
### 2.1 Why This Service Exists
The chatbot encourages engagement within chat communities by rewarding active user participation with points and interactive mini-games. It fosters community loyalty and provides admins control for managing the chat ecosystem.

### 2.2 Revenue Strategy
Currently non-monetized; potential future revenue streams include subscription or paid features linked to gamification.

### 2.3 Growth Plan
Drive higher user retention and activity levels leveraging gamification elements and admin flexibility.

### 2.4 Key Features
- Real-time message processing
- Points awarded on eligible messages
- Mini-games (Virtual Stock Trading and Slot Machine)
- Title system with fee discounts
- Admin controls through dedicated rooms

## 3. User Roles and Permissions
### 3.1 Roles
- Member: End users in normal rooms who earn points and play games.
- Admin: Elevated users in admin rooms managing system configuration.

### 3.2 Authentication
Users are identified by internal unique IDs mapped from external sender IDs.

### 3.3 Role Determination
Role is inferred from the room context of incoming messages.

## 4. Core Functional Requirements
### 4.1 Message Reception
Webhook endpoint at `/webhook` receives messages with sender_id, nickname, and room_id.

### 4.2 Data Privacy
Sender and room IDs stored internally but not exposed externally.

### 4.3 Point Awarding
1 point per message over 3 characters, with 1-second cooldown, unlimited accumulation.

### 4.4 Command Handling
Commands prefixed with `/` supported for both normal and admin users, scoped by room.

## 5. Minigames
### 5.1 Virtual Stock Trading
Six initial stocks, transaction fees, price updates daily and on transactions, admin management.

### 5.2 Slot Machine
Free spins, betting minimum, payout rules included.

## 6. Title System
Title string field in user record, fee discount property, single assignment by admin.

## 7. Room and Session Management
Room tuples pairing normal and admin rooms, with display names and unique IDs.

## 8. Administrative Features
Admin commands for user points, titles, stocks, and room tuple management.

## 9. Audit Logging
Command logs, minigame results, stock price and transaction logs only.

## 10. Error Handling
Clear error messages for invalid commands, insufficient funds, permission errors.

## 11. Performance Requirements
Real-time response under 1 second for commands and message processing.

## 12. Security and Privacy
Sensitive IDs internal only, admin controls via room context, no external authentication.

## 13. Appendix
Mermaid diagrams illustrating message and stock update flows.

---

All requirements use EARS format and are implementation-ready.