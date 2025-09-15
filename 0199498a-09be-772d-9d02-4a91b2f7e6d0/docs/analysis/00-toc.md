# 사용자 역할 및 권한 정책 요구사항 명세서

## 1. 역할 식별 및 설명

### 역할 목록 및 책임

- **authenticatedUser(인증된 사용자)**
    - StoryField AI 서비스에 등록되어 Spring 백엔드(회원가입, 인증절차)에서 발급받은 Access Token을 소유한 사용자이다.
    - THE authenticatedUser SHALL be able to:
        - generate fairy tales (동화 생성) via text or audio input.
        - request TTS and dialect transformation services for generated content.
        - access and view only their OWN generated stories, images, and audio.
    - THE authenticatedUser SHALL NOT be able to:
        - access, modify, or delete other users’ generated stories or audio.
        - access administrative controls, audit logs, or user management features.

- **systemAdmin(시스템 관리자)**
    - 서비스 운영 및 보안 관리 목적으로 부여된 관리자 권한자.
    - THE systemAdmin SHALL be able to:
        - monitor system health, usage statistics, and integration status.
        - view and manage (revoke, refresh) access tokens for any user.
        - access logs and audit trails for abuse detection and security monitoring.
        - perform user management operations (account control, forced logout, or emergency suspension).

    - THE systemAdmin SHALL NOT be able to:
        - generate fairy tales on behalf of other users (unless explictly acting impersonate mode).


## 2. 인증 및 토큰 검증 플로우

### 2-1. 인증 요구
- 모든 StoryField AI 서비스 주요 기능은 인증을 요구한다. 
- WHEN a user attempts to access protected endpoints, THE system SHALL require a valid access token (JWT) issued by the Spring backend.

### 2-2. 인증 토큰 및 세션
- WHEN a user successfully logs in via Spring, THE backend SHALL issue an Access Token and manage token-to-user mapping in Redis.
- THE JWT SHALL contain userId, role, and permissions required to enforce access control.
- WHILE a token is valid and unexpired, THE storyfieldAi system SHALL honor the session.
- IF the token is missing, expired, or revoked in Redis, THEN THE system SHALL reject the request and respond with an authentication error.
- WHEN a user logs out, THEN THE Spring backend SHALL remove (invalidate) the token from Redis and future requests using this token SHALL fail authentication.

### 2-3. 토큰 만료 및 리프레시
- THE access token SHALL be valid only for a short period (recommended 15~30 minutes) and must be refreshed via explicit login or refresh flow in the Spring backend.
- IF a token is detected as expired or invalid, THEN THE storyfieldAi system SHALL NOT attempt to auto-renew and SHALL require explicit re-authentication.
- THE refresh token (managed solely by the Spring backend) SHALL NOT be interpreted by the storyfieldAi system.

### 2-4. 토큰 유효성 검증 흐름
- WHEN a protected request is received, THE storyfieldAi system SHALL:
    1. Extract the bearer token from the Authorization header.
    2. Validate token signature, expiration, and Redis presence via Spring backend.
    3. Decode the role and permissions from JWT payload.
    4. Make an authorization decision based on the permission matrix (see Section 4).
- IF validation fails at any stage, THEN THE system SHALL immediately halt processing and respond with an authentication error (see Error Handling doc).

## 3. 인가/권한 관리 원칙 및 흐름

### 3-1. 인가 포인트 및 정책
- THE system SHALL enforce role-based authorization at every protected API endpoint and core service operation.
- WHEN an authenticatedUser submits a request to generate a fairy tale or request TTS/dialect, THE system SHALL validate the user's role as "authenticatedUser".
- WHEN a systemAdmin attempts to perform administrative actions (view logs, manage tokens/users), THE system SHALL validate the "systemAdmin" role for such operations.
- WHERE an action attempts to access or modify a resource not owned by the user, THE system SHALL forbid the request and provide an appropriate denial message.

### 3-2. 오류 처리 및 부정 접근 대응
- IF an authentication or authorization failure is detected, THEN THE system SHALL respond with a clear, actionable error message and an appropriate HTTP status code (per Error Handling and Recovery policies).
- Failures SHALL be logged with user id and action context for admin review.
- Repeated invalid attempts MAY trigger automated temporary lockout or alert escalation (see business rules and monitoring requirements).

## 4. Permission Matrix (역할별 행위 권한 표)

| 기능/행위 | authenticatedUser | systemAdmin |
|-------------------------------|----------------------|--------------|
| 회원 가입/인증                | ✅ *Spring 서비스*   | ❌           |
| 동화 생성(텍스트/오디오)       | ✅                   | ❌           |
| 내 동화/오디오 조회            | ✅                   | ✅ *모든 유저*|
| 타인 동화/오디오 접근          | ❌                   | ✅           |
| 동화/오디오 삭제               | ✅(본인껏만)           | ✅           |
| 로그/감사 기록 조회            | ❌                   | ✅           |
| TTS/사투리 서비스 요청         | ✅                   | ✅           |
| 관리자 기능(유저 관리/토큰 관리)| ❌                   | ✅           |
| 시스템 상태/통계 모니터링      | ❌                   | ✅           |

* 표 내 "모든 유저"는 시스템 관리자가 전체 데이터에 접근 권한을 가짐.

## 5. 역할 확장성과 관리적 통제

### 5-1. 역할 추가/확장 시나리오
- WHERE new user types or business requirements necessitate additional roles (e.g., "premiumUser", "moderator"), THE storyfieldAi system SHALL support configurable role/permission mappings via the Spring backend.
- THE permission matrix and authorization policies SHALL be updated accordingly and documented.

### 5-2. 관리자 권한 이관 및 긴급 차단
- WHEN an administrative account must be transferred or disabled (e.g., due to personnel change, security breach), THE systemAdmin (or designated super admin) SHALL be able to:
    - revoke the old admin's token immediately
    - assign admin privileges to another authenticatedUser (promotion)
- IF suspicious or abusive behavior is detected, THEN THE system SHALL allow emergency suspension of any account pending further review.

### 5-3. 토큰 라이프사이클 및 관리 통제
- THE service SHALL allow systemAdmin to forcibly expire (revoke) any access token to mitigate abuse or respond to incidents.
- THE service SHALL NOT allow users to extend token lifetimes beyond policy constraints.
- Auditing and reporting of all token-related administrative actions SHALL be maintained (see compliance documentation).

## 추가 비즈니스 규칙
- Role/Permission 관련된 모든 변경점은 즉시 서비스 문서 및 운영자 안내에 반영되어야 하고, 테스트 API에서도 동일하게 정책이 적용되어야 한다.
- 인증/인가 오류, 토큰 만료, 권한 없음 안내는 일관된 에러 메시지 포맷 및 사용자 친화적 설명을 필수로 제공해야 한다.(상세 내용은 별도 에러 핸들링 정책 문서 참고)

---

> *Developer Note: 이 문서는 오직 비즈니스 요구사항만을 정의합니다. 모든 기술 구현(아키텍처, API, 데이터베이스 설계 등)은 개발팀의 재량에 따릅니다.*