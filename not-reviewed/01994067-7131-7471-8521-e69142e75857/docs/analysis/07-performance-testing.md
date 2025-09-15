# OAuth 서버 전체 요구사항

## 1. 소개

### 1.1 서비스 개요 및 목표

THE OAuth 서버 SHALL 구현 OAuth 2.0 및 OpenID Connect Core 1.0 기반의 인증 및 인가 서버이다.
특히 개발자 친화적으로 설계되어, 5분 내에 연동 완료 가능함을 목표로 하며, 단계적 기능 확장과 높은 호환성을 가진다.

### 1.2 비즈니스 모델

THE system SHALL 제공 OAuth 인증 서비스로, 자체 이메일 가입과 네이버, 다음, 애플, 구글 소셜 로그인 지원을 포함한다.
THE system SHALL 사용자에게 포인트 기반의 디지털 상품 구매 기능을 제공하며, 포인트 지급 쿠폰도 지원한다.
THE system SHALL 외부 게임 전적 API(배틀그라운드, 롤)를 연동하여 시즌별 전적 데이터를 사용자에게 제공한다.

### 1.3 사용자 역할 및 권한

THE system SHALL 구분 다음과 같은 사용자 역할을 지원한다.
- guest: 인증되지 않은 방문자, 로그인 및 회원가입 가능
- member: 인증된 사용자, 프로필 및 OAuth 토큰 관리
- admin: 전체 시스템 관리 및 감사 권한 보유
- developer: 클라이언트 등록 및 SDK 생성 권한 보유

THE system SHALL 각 역할별 접근 권한을 명확히 하며, 역할별 권한 위반 시 적절한 에러 응답을 제공해야 한다.

## 2. 데이터 모델 및 변경 관리

### 2.1 User 및 OAuthClient, SimpleAuthCode 데이터 테이블

THE system SHALL User 테이블에 필수 OIDC 필드를 포함하고,
THE system SHALL OAuthClient 테이블과 SimpleAuthCode 테이블에 대한 soft delete 컬럼 deletedAt을 포함한다.

THE system SHALL 빈번히 변경되는 프로필 필드(예: 닉네임, 프로필 사진)는 별도의 UserProfile 테이블 등으로 분리 관리한다.

### 2.2 Soft Delete 및 변경 이력 관리

THE system SHALL User 테이블을 제외한 모든 테이블에 deletedAt 컬럼을 두어 soft delete 상태를 관리한다.

THE system SHALL 프로필 빈번 변경 컬럼은 별도 테이블 분리로 관리하며, 변경 이력 로깅 기능도 제공해야 한다.

## 3. 인증 및 인가 흐름

### 3.1 OAuth 2.0 Authorization Code Grant

WHEN 클라이언트가 /oauth/authorize 엔드포인트로 인가를 요청하면,
THE system SHALL 로그인 상태를 판단하여 미로그인 시 로그인 페이지로 유도한다.

WHEN 클라이언트가 신뢰 클라이언트인 경우,
THE system SHALL 이용자의 동의 과정을 자동 처리하여 동의 페이지를 생략한다.

THE system SHALL 인가 코드를 생성하여 SimpleAuthCode 테이블에 JSONB로 저장한다.

THE system SHALL 인가 코드와 클라이언트를 검증하여 opaque token(access_token, refresh_token)을 발급한다.

### 3.2 토큰 관리 및 세션

THE system SHALL access_token 및 refresh_token을 opaque token 방식으로 발급하며,
키 생성 방식은 UUID, CUID 또는 ULID 중 적절한 것을 사용할 수 있다.

THE system SHALL SimpleTokenService가 토큰 생성, 검증, 무효화를 담당한다.

THE system SHALL OAuth 토큰 관련 데이터는 Redis 캐시를 활용해 성능을 최적화한다.

### 3.3 소셜 로그인 및 외부 OAuth 연동

THE system SHALL 네이버, 다음, 애플, 구글 소셜 로그인 OAuth 공급자 연동을 제공한다.

THE system SHALL 자체 이메일 가입과 소셜 로그인에서 동일 이메일이면 같은 회원으로 처리한다.

THE system SHALL 외부 OAuth 공급자로서 자체 서버를 사용할 수 있도록 클라이언트 등록 및 관리 기능을 제공한다.

## 4. 포인트 및 쿠폰 시스템

THE system SHALL 사용자별 포인트 잔액을 관리하며,
THE system SHALL 아이콘 구매 등에 포인트 사용 기능을 제공한다.

THE system SHALL 포인트 적립 및 사용 내역을 UserPointHistory 테이블로 관리한다.

THE system SHALL 포인트 지급 쿠폰을 생성 및 관리하며,
사용자는 쿠폰 코드 입력으로 포인트를 충전할 수 있다.

THE system SHALL 쿠폰 코드 중복 사용 및 만료 여부를 검증한다.

## 5. 게임 전적 연동

THE system SHALL 사용자 프로필에 스팀/카카오 배틀그라운드, 롤 플레이어명을 등록할 수 있다.

THE system SHALL 공식 API를 통해 시즌별 게임 전적 데이터를 조회 가능하게 한다.

THE system SHALL 조회된 전적 데이터는 Redis 캐시를 통해 TTL 설정으로 관리한다.

## 6. 보안 및 감사

THE system SHALL 프로덕션 환경에서 HTTPS를 강제하고,
THE system SHALL PKCE 및 상태 파라미터 검증으로 보안을 강화한다.

THE system SHALL IP별 및 클라이언트별 Rate Limiting 정책을 적용한다.

THE system SHALL 중요 인증 및 인가 이벤트에 대해 감사 로깅을 수행한다.

## 7. 운영 및 관리

THE system SHALL 관리자용 클라이언트, 사용자, 토큰 관리 페이지를 제공한다.

THE system SHALL 토큰 발급 현황 및 최근 로그인 기록을 관리자가 조회할 수 있게 한다.

THE system SHALL 관리자 권한별 접근 제한 및 작업 로그 기록 기능을 포함한다.

## 8. 개발 환경 및 도구

THE system SHALL Node.js 18+, PostgreSQL 13+, pnpm 패키지 매니저를 사용한다.

THE system SHALL Docker 기반 개발 및 프로덕션 환경 설정을 지원한다.

THE system SHALL Playwright 기반 E2E 테스트 스크립트를 기본 프론트엔드 페이지에 적용한다.

## 9. 테스트 및 성능 요구사항

THE system SHALL OAuth 2.0 전체 인증 흐름 테스트 시나리오를 구성한다.

THE system SHALL 토큰 발급 응답 시간은 100ms 이하를 유지한다.

THE system SHALL 100 동시 요청 처리를 보장한다.

THE system SHALL 에러 케이스 발생 시 한국어 친숙 메시지와 복구 방법을 제공한다.

## 10. 성공 기준 및 문서화

THE system SHALL 5분 내 OAuth 연동 완료를 목표로 개발자 경험을 최적화한다.

THE system SHALL OAuth 2.0 및 OpenID Connect Core 1.0 표준을 완전 준수한다.

THE system SHALL Redis 캐싱을 전체 시스템에 활용하여 성능 최적화를 달성한다.

THE system SHALL 모든 주요 기능과 워크플로우에 대해 EARS 형식 엄격 준수하여 기술한다.


---

## Mermaid Diagram: OAuth 인증 흐름

```mermaid
graph LR
  A["사용자 인증 요청"] --> B{"로그인 상태인가?"}
  B --|"No"| C["로그인 페이지로 리다이렉트"]
  B --|"Yes"| D["클라이언트 신뢰 여부 확인"]
  D --> E{"신뢰 클라이언트인가?"}
  E --|"Yes"| F["동의 화면 생략"]
  E --|"No"| G["동의 화면 표시"]
  F --> H["인가 코드 생성 및 저장"]
  G --> H
  H --> I["클라이언트 콜백 URL로 리다이렉트"]

  J["POST /oauth/token 요청"] --> K["인가 코드 검증"]
  K --> L["클라이언트 인증"]
  L --> M["opaque 토큰(access, refresh) 발급"]
  M --> N["토큰 응답 반환"]

  O["GET /oidc/userinfo 요청"] --> P["Bearer 토큰 검증"]
  P --> Q["스코프 검증 및 사용자 정보 반환"]

  C -.-> B
  N --> O
```


---

THE system PROVIDES business requirements only and leaves technical implementations including API and DB design to development teams. Developers have full autonomy on architecture and implementation details.