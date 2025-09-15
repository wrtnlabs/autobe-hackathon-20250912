# Chatbot Server Backend Business Requirements

## 1. Introduction
The chatbot backend provides a real-time interactive system handling user messages received via webhook, awarding points based on user message content, and managing minigame interaction and administrative controls through dedicated admin rooms.

## 2. Business Model
### 2.1 Why the Service Exists
This chatbot system fills the market need for engaging chat interactions enriched with gamified user participation. It retains users by rewarding activity and offering entertaining minigames alongside administrative control capabilities.

### 2.2 Revenue and Engagement Strategy
Although no direct monetization is implemented yet, the point system and games form a base for potential future paid features or premium content.

### 2.3 Core Value Proposition
- Instant response to user messages.
- Points awarded per meaningful message with cooldown enforcement.
- Multiple minigames supporting engagement.
- Separate administrative rooms for dynamic control.

## 3. User Roles and Permissions
### 3.1 Roles
- Member: Participants in normal chat rooms who earn points, use commands, and play minigames.
- Admin: Participants in admin rooms with privileges to manage points, titles, stocks, and rooms.

### 3.2 Role Determination
User roles are not saved per user but are deduced from the room from which the message originates.

### 3.3 Permissions
Members have access to point gains and regular commands only in normal rooms. Admins only perform administrative commands in admin rooms.

## 4. Core Features
### 4.1 Message Reception
Webhook listens at /webhook for POST requests with message payloads consisting of sender id (private), nickname, room id (private), and text.

### 4.2 Points System
Points are awarded for messages at least 3 characters long, with a minimum 1-second cooldown per user. Unlimited point accumulation is supported.

### 4.3 Command Handling
Commands begin with '/' and are parsed based on user role (normal/admin) and room type.

### 4.4 Minigames
Supports virtual stock trading and slot machine games with defined rules for betting, payouts, and transaction fees.

## 5. Minigames
### 5.1 Virtual Stock Trading
Up to unlimited stock items supported, initially 6 placeholders. Prices update daily and on trade activity. Buying/selling incurs 5% fees reducible by title discounts. Removing a stock refunds all user holdings.

### 5.2 Slot Machine
Slot machine spins three digits 0-9; minimum bet of 100 points; payouts vary by symbol match.

## 6. Title System
Titles are simple strings stored in the user record, assigned by admin commands with associated fee discounts.

## 7. Room and Session Management
Room tuples track linked admin and normal rooms with ids and display names. Sessions and data are isolated by room.

## 8. Administrative Functions
Admin commands include user point adjustment, title assignment, stock item management, and room tuple controls.

## 9. Audit and Logging
Commands, minigame results, stock price updates, and transactions are logged. No chat message content logged.

## 10. Error and Performance Handling
Descriptive error messages are returned on invalid commands or insufficient resources. Processing meets near real-time expectations.

## 11. Security and Privacy
Sensitive identifiers stored internally and never exposed; admin authorization controlled by room context; operation assumed on trusted local network without explicit authentication.

## 12. Appendices
Mermaid diagrams illustrate message, stock price, and command processing flows.


---

This document provides business requirements only. Technical implementation is left to developer discretion.