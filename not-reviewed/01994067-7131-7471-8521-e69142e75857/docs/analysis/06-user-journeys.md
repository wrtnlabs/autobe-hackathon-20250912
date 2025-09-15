# OAuth 서버 종합 요구사항

## 1. 서비스 개요 및 목적

THE OAuth 서버 SHALL OAuth 2.0과 OpenID Connect Core 1.0 표준을 완전하게 준수한다.
THE OAuth 서버 SHALL 개발자가 5분 내에 연동할 수 있을 정도로 간단하고 직관적인 인터페이스를 제공한다.
THE OAuth 서버 SHALL 점진적인 확장을 고려하여 기본 OAuth 기능부터 고급 보안 기능까지 단계적으로 구현할 것이다.

## 2. 사용자 역할 및 권한 정의

### 2.1 역할 구분
- guest: 비인증 사용자로 로그인 및 회원가입 페이지 접근 권한을 가진다.
- member: 인증된 사용자로 본인 프로필 관리, 토큰 사용, 소셜 로그인 연동 기능을 수행할 수 있다.
- admin: 시스템 관리자 권한을 가지고 사용자 및 클라이언트 관리, 보안, 감사 로그를 처리한다.
- developer: OAuth 클라이언트 등록과 SDK 사용, API 테스팅 등의 개발자 도구 사용 권한을 가진다.

### 2.2 인증 및 권한 처리
- WHEN 사용자가 로그인 요청을 하면, THE OAuth 서버 SHALL 해당 사용자의 자격 증명을 검증하고 세션을 생성한다.
- WHEN 토큰이 필요한 요청이 들어오면, THE OAuth 서버 SHALL 발급된 토큰에 대해 유효성 및 권한 범위를 검사한다.
- IF 사용자가 접근 권한이 없는 요청을 하면, THEN THE OAuth 서버 SHALL 적절한 한글 에러 메시지와 함께 접근을 거부한다.

## 3. 핵심 기능 요구사항

### 3.1 OAuth 인가 코드 흐름
- WHEN OAuth 클라이언트가 /oauth/authorize 엔드포인트에 접근하면, THE OAuth 서버 SHALL 로그인 상태를 확인하고
  미인증 시 로그인 페이지로 리다이렉트한다.
- IF 클라이언트가 신뢰됨(is_trusted)으로 표시되어있으면, THEN THE OAuth 서버 SHALL 동의 화면을 생략하고 자동 승인한다.
- WHEN 사용자가 동의하면, THE OAuth 서버 SHALL 인가 코드를 생성하고 JSONB 형식으로 관련 데이터를 저장한다.
- THE OAuth 서버 SHALL 콜백 URL로 인가 코드를 리다이렉트한다.

### 3.2 토큰 발급 및 검증
- THE OAuth 서버 SHALL access_token과 refresh_token을 불투명 토큰(opaque token)으로 발급하며, UUID, CUID, ULID 중 하나를 적절히 사용한다.
- WHEN /oauth/token 엔드포인트에 POST 요청이 들어오면, THE OAuth 서버 SHALL 인가 코드를 확인하고 클라이언트 인증을 수행한다.
- THE OAuth 서버 SHALL access_token, id_token, refresh_token을 모두 발급하며, id_token은 OIDC 표준 클레임을 포함한다.
- THE OAuth 서버 SHALL Redis 캐싱을 통해 토큰 검증 성능을 최적화한다.

### 3.3 사용자 관리
- THE OAuth 서버 SHALL 이메일과 비밀번호를 통한 자체 회원가입과 로그인 기능을 지원한다.
- THE OAuth 서버 SHALL 이메일이 동일한 경우 소셜 로그인 계정과 자체 계정을 통합하여 단일 사용자로 관리한다.
- THE OAuth 서버 SHALL 사용자 별로 변경 빈도가 높은 닉네임, 프로필사진 등의 정보를 별도의 프로필 테이블로 분리하여 관리한다.

## 4. 소셜 로그인 및 외부 OAuth 연동

### 4.1 소셜 로그인 지원
- THE OAuth 서버 SHALL 네이버, 다음, 애플, 구글 등 주요 소셜 로그인 공급자를 지원한다.
- THE OAuth 서버 SHALL 소셜 로그인 시 이메일이 동일하면 기존 계정과 연동한다.

### 4.2 자체 OAuth 서버를 외부 서비스에서 사용 가능
- THE OAuth 서버 SHALL 외부 서비스가 OAuth 클라이언트로 등록하고 자체 OAuth 공급자로 사용할 수 있도록 지원한다.
- THE OAuth 서버 SHALL Discovery 및 JWKS 엔드포인트를 포함한 표준 OIDC 엔드포인트를 제공한다.

## 5. 토큰 관리 및 Redis 캐싱

- THE OAuth 서버 SHALL Redis를 사용하여 토큰 검증, 사용자 정보 조회, 클라이언트 데이터 및 전적 API 결과를 캐싱한다.
- THE OAuth 서버 SHALL 적절한 TTL 값을 설정하고 캐시 무효화 정책을 적용하여 신뢰성과 성능을 보장한다.

## 6. 사용자 프로필 및 게임 전적 연동

- THE OAuth 서버 SHALL 사용자 프로필에 스팀 배틀그라운드 플레이어명, 카카오 배틀그라운드 플레이어명, 롤 플레이어명을 등록할 수 있도록 한다.
- THE OAuth 서버 SHALL 공식 API를 통해 시즌별 배틀그라운드와 롤 게임 전적 데이터를 조회할 수 있어야 한다.
- THE OAuth 서버 SHALL 전적 데이터 조회 시 Redis 캐싱을 적용하여 API 호출량을 줄이고 응답 속도를 향상시킨다.

## 7. 관리자 기능 및 운영 관리

- THE OAuth 서버 SHALL 관리자 페이지를 통해 클라이언트 등록, 수정, 삭제 및 시크릿 재생성 기능을 제공한다.
- THE OAuth 서버 SHALL 사용자 목록 조회, 프로필 수정, 비활성화 및 삭제 기능을 제공한다.
- THE OAuth 서버 SHALL 활성 토큰 수 모니터링, 이상 징후 탐지 기능 및 감사 로그 조회 기능을 포함한다.

## 8. 보안 정책 및 감사 로그

- THE OAuth 서버 SHALL HTTPS를 프로덕션 환경에서 강제한다.
- THE OAuth 서버 SHALL PKCE를 지원하며, 공개 클라이언트에 대해 반드시 적용한다.
- THE OAuth 서버 SHALL IP 및 클라이언트별 기본적인 Rate Limiting을 적용한다.
- THE OAuth 서버 SHALL 주요 인증 및 인가 이벤트에 대해 감사 로그를 남기고 민감 정보는 로그에 기록하지 않는다.

## 9. 배포 및 환경 설정

- THE OAuth 서버 SHALL Node.js 18 이상, PostgreSQL 13 이상을 지원한다.
- THE OAuth 서버 SHALL pnpm 패키지 매니저를 사용하여 의존성을 관리한다.
- THE OAuth 서버 SHALL Docker 및 docker-compose 기반 개발 및 프로덕션 환경 구성을 지원한다.
- THE OAuth 서버 SHALL 환경변수를 통해 데이터베이스 연결, JWT 비밀키, 포트 등을 설정한다.

## 10. 성능 및 테스트 계획

- THE OAuth 서버 SHALL 토큰 발급 응답 시간을 100ms 이내로 유지한다.
- THE OAuth 서버 SHALL 100 동시 요청을 안정적으로 처리할 수 있어야 한다.
- THE OAuth 서버 SHALL Playwright를 사용한 프론트엔드 E2E 테스트를 구현한다.
- THE OAuth 서버 SHALL OAuth 플로우와 각 API에 대한 기능, 성능, 보안 테스트를 체계적으로 수행한다.

## 11. 에러 처리 및 사용자 안내

- THE OAuth 서버 SHALL 모든 에러 메시지를 한글로 제공하며, 문제 해결 방법을 안내한다.
- IF 인증 실패나 권한 부족 등의 에러 발생 시, THEN THE OAuth 서버 SHALL 사용자에게 친숙한 에러 메시지와 복구 절차를 제공한다.

## 12. 성공 기준 및 문서화

- THE OAuth 서버 SHALL 개발자가 5분 내에 OAuth 연동을 완료할 수 있도록 한다.
- THE OAuth 서버 SHALL OpenID Connect Core 1.0 및 RFC 6749 OAuth 2.0 표준을 모두 준수한다.
- THE OAuth 서버 SHALL 토큰 발급 응답 속도가 100ms 이하이며, 기본적인 Rate Limiting과 HTTPS 강제 적용이 되어야 한다.
- THE OAuth 서버 SHALL 친숙한 한글 에러 메시지 및 해결 방법 안내, 관리자 기능, 감사 로그, 테스트 및 개발 도구를 포함한 완전한 문서화를 제공한다.

---

```mermaid
graph LR
  A["OAuth 클라이언트 인가 요청"] --> B{"사용자 로그인 상태 확인"}
  B --|"미인증"| C["로그인 페이지로 리다이렉트"]
  B --|"인증됨"| D{"신뢰 클라이언트 여부 확인"}
  D --|"신뢰 클라이언트"| E["자동 동의 처리 및 인가 코드 생성"]
  D --|"비신뢰 클라이언트"| F["동의 화면 표시"]
  E --> G["인가 코드 저장(JSONB) 및 콜백 URL 리다이렉트"]
  F --> G
  G --> H["권한 검증 및 토큰 발급 요청"]
  H --> I["인가 코드 확인 및 클라이언트 인증"]
  I --> J["opaque access_token, id_token, refresh_token 발급"]
  J --> K["토큰 응답 및 Redis 캐싱"]
  K --> L["사용자 정보 조회 (UserInfo) 및 스코프 필터링"]

```