## Authentication Flow for Pay Band System

The Pay Band System enables two distinct user roles: hrOperator (admin) and employeeViewer (member). Authentication must enforce strict separation of access rights while providing a seamless, secure entry experience. This document defines the complete authentication flow in business language, ensuring developers understand WHAT the system must do — not HOW to build it.


## Authentication Goals

THE Pay Band System SHALL enable secure, role-based access for human resources operators and general employees, ensuring that only authorized users can interact with the system and that each user can only perform actions permitted by their role. The system SHALL prevent unauthorized access to sensitive data or configuration tools, and SHALL automatically terminate inactive sessions to protect compensation information.


## Login Process

WHEN a user visits the Pay Band System, THE system SHALL display a unified login page accepting email and password.

WHEN the user submits valid credentials, THE system SHALL authenticate the user against the central user directory and determine the assigned role (hrOperator or employeeViewer).

WHEN authentication succeeds, THE system SHALL redirect the user to the appropriate home view based on role: HR operators to the data upload and simulation interface, and employees to the read-only visualization dashboard.

WHEN authentication fails due to incorrect email or password, THE system SHALL display a clear message: "Invalid email or password. Please try again."

WHEN authentication fails due to an inactive or disabled account, THE system SHALL display: "Your account is currently inactive. Please contact your HR department."

WHILE the user is unauthenticated, THE system SHALL NOT display any Pay Band data, simulation controls, or upload options.


## Session Management

WHEN a user successfully logs in, THE system SHALL create a secure session and issue a JSON Web Token (JWT).

WHILE the user is active (i.e., making requests or interacting with the interface), THE system SHALL extend the session validity by resetting the inactivity timer.

WHEN the user remains inactive for more than 30 minutes, THE system SHALL automatically terminate the session and clear all session state.

WHEN a user initiates any action after session expiry, THE system SHALL redirect the user to the login page with a message: "Your session has expired. Please log in again."

WHEN a new login occurs for a user who already has an active session, THE system SHALL invalidate the previous session token and issue a new one.


## Token Usage (JWT)

THE Pay Band System SHALL use JSON Web Tokens (JWT) for stateless authentication.

THE JWT payload SHALL contain at minimum:
- userId: unique alphanumeric identifier of the user (e.g., "usr_abc123")
- role: string value matching exactly one of: "hrOperator" or "employeeViewer"

THE JWT SHALL NOT contain:
- Email address
- Password
- Personal identifiers (e.g., social security number)
- Any data not required for role-based access control

THE system SHALL validate each incoming request using the JWT signature and role claim.

WHEN a request contains an invalid or expired JWT, THE system SHALL reject the request with HTTP 401 Unauthorized and clear any client-side session state.

WHEN a request contains a valid JWT but the role does not match the requested action (e.g., employeeViewer attempts to upload data), THE system SHALL reject the request with HTTP 403 Forbidden.


## Logout and Session Expiry

WHEN the user selects "Log Out", THE system SHALL clear the JWT from client storage, terminate the server-side session, and redirect the user to the login page with the message: "You have been logged out successfully."

WHEN the session expires due to inactivity, THE system SHALL behave as if the user manually logged out: all data is cleared, and navigation to protected pages shall redirect to login.

THE system SHALL NOT automatically attempt to refresh a token without user interaction.


## Security Requirements

THE system SHALL require all traffic to use HTTPS.

THE system SHALL reject any request lacking a valid JWT.

THE system SHALL NOT allow JWTs to be passed through URL parameters.

THE system SHALL NOT expose the JWT payload to frontend code in plain text beyond what is necessary for role-based UI rendering (e.g., showing/hiding buttons).

WHERE the user is a hrOperator, THE system SHALL enforce that no simulation or upload functionality is accessible without a validated JWT containing role: "hrOperator".

WHERE the user is an employeeViewer, THE system SHALL enforce that all data displayed is read-only, and no interface controls for modification are rendered or enabled.

IF a JWT is tampered with, modified, or signed with an unauthorized key, THEN THE system SHALL immediately invalidate the token and display an error message to the user: "Your session is no longer valid. Please log in again."

WHILE a session is active, THE system SHALL protect against session riding and CSRF attacks by requiring consistent token usage and validating origin context on sensitive operations such as uploads and simulation triggers.