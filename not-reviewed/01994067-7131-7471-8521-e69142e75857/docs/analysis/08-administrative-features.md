# OAuth 서버 비즈니스 요구사항

## 1. 서비스 개요 및 비즈니스 모델

### 1.1 서비스 목적
THE OAuth 서버 SHALL OAuth 2.0과 OpenID Connect Core 1.0 표준을 완벽하게 준수하며, 네이버 수준의 간단한 연동을 지원하는 인증 인가 서버로서 개발된다.

### 1.2 비즈니스 가치
THE OAuth 서버 SHALL 개발자가 5분 내에 인증 연동을 완료할 수 있도록 하며, 안정적이고 확장 가능한 인증 서비스를 제공한다.

### 1.3 주요 기능
- 자체 이메일 로그인 및 소셜 로그인(Naver, Daum, Apple, Google) 통합 지원
- 불투명(access_token, refresh_token) 토큰 발급 및 검증
- 포인트 및 쿠폰 시스템 제공
- 배틀그라운드 및 롤 공식 API를 통한 시즌별 전적 조회 지원
- 외부 OAuth 서버 연동 및 멀티 테넌시 지원
- Redis 캐싱을 통한 성능 최적화
- Playwright 기반 프론트엔드 E2E 테스트 지원

## 2. 사용자 역할 및 권한

### 2.1 역할 정의
| 역할 | 설명 | 권한 |
|------|-------|-------|
| guest | 비인증 사용자 | 로그인 및 회원가입 페이지 접근 가능 |
| member | 인증 사용자 | 프로필 관리, OAuth 인증 및 토큰 사용 가능 |
| admin | 관리자 | 사용자 및 클라이언트 관리, 감사 로그 조회 가능 |
| developer | 개발자 | 클라이언트 등록 및 SDK 사용 가능 |

### 2.2 인증 요구사항
- WHEN 사용자가 로그인 요청 시, THE 시스템 SHALL 이메일 및 비밀번호, 소셜 로그인 정보를 검증한다.
- WHEN 사용자가 소셜 로그인 시, THE 시스템 SHALL 이메일을 기준으로 기존 계정과 통합 관리한다.

## 3. 핵심 기능 요구사항

### 3.1 OAuth 인가 코드 플로우
- WHEN 클라이언트가 GET /oauth/authorize 요청하면 THE 시스템 SHALL 로그인 상태를 확인하고, 미인증 시 로그인 페이지로 리다이렉트한다.
- WHERE 클라이언트가 신뢰 클라이언트일 경우, THE 시스템 SHALL 동의 화면을 생략한다.
- WHEN 사용자가 동의 시, THE 시스템 SHALL 인가 코드를 발급하고, JSONB 형태로 관련 정보를 저장한다.
- THE 시스템 SHALL 인가 코드를 검증하여 POST /oauth/token에서 access_token, id_token, refresh_token을 불투명 토큰 형태로 발급한다.

### 3.2 토큰 관리
- THE 시스템 SHALL access_token과 refresh_token을 UUID, CUID, ULID 방식으로 생성된 불투명 토큰으로 발급한다.
- THE 시스템 SHALL Redis를 이용해 토큰 검증 및 사용자 정보 캐싱을 수행하여 성능을 최적화한다.

### 3.3 사용자 및 클라이언트 관리
- THE 시스템 SHALL UserProfile, ClientProfile 같은 별도 테이블로 닉네임, 프로필사진 등 빈번하게 변경되는 정보를 분리해 관리한다.
- THE 시스템 SHALL User 외에 나머지 테이블에 soft delete용 deletedAt 컬럼을 포함한다.
- THE 시스템 SHALL 클라이언트 등록, 수정, 삭제, 시크릿 재생성을 제공한다.

### 3.4 소셜 로그인 및 외부 OAuth 연동
- THE 시스템 SHALL 네이버, 다음, 애플, 구글 소셜 로그인 OAuth 공급자 연동을 지원한다.
- THE 시스템 SHALL 외부 OAuth 서버도 내 OAuth 서버를 클라이언트로 사용 가능하도록 한다.
- THE 시스템 SHALL 관리자 UI 또는 환경변수로 OAuth 공급자 클라이언트 정보를 관리한다.

### 3.5 프로필 및 게임 전적
- THE 시스템 SHALL 사용자 프로필에 Steam PUBG, Kakao PUBG, 롤 플레이어명을 등록 및 수정 가능하다.
- THE 시스템 SHALL 공식 API를 통해 시즌별 배틀그라운드 및 롤 전적을 조회한다.
- THE 시스템 SHALL Redis 캐싱을 통해 전적 데이터 업데이트를 효율적으로 처리한다.

### 3.6 포인트 및 쿠폰
- THE 시스템 SHALL 사용자의 포인트 잔액을 관리하며, 아이콘 구매 등에 사용한다.
- THE 시스템 SHALL 쿠폰 코드 입력을 통해 포인트 충전 기능을 제공한다.
- THE 시스템 SHALL 쿠폰의 유효성(만료, 사용 여부 등)을 검증한다.

### 3.7 Playwright E2E 테스트
- THE 시스템 SHALL 기본 프론트엔드 페이지에 대해 Playwright 기반 E2E 테스트를 포함한다.
- THE 시스템 SHALL 로그인 페이지, 동의 페이지, 에러 페이지 등 주요 사용자 화면을 자동화 테스트한다.

## 4. 관리 및 운영

### 4.1 관리자 기능
- THE 시스템 SHALL 클라이언트 관리, 사용자 관리, 토큰 모니터링, 감사 로그 조회 기능을 제공한다.
- THE 시스템 SHALL soft delete된 데이터는 인증 및 토큰 발급에서 제외한다.

### 4.2 보안 요구사항
- THE 시스템 SHALL HTTPS 를 프로덕션 환경에서 강제한다.
- THE 시스템 SHALL PKCE, Rate Limiting, State 파라미터 검증 등 보안 기능을 포함한다.

## 5. 성능 및 품질

- THE 시스템 SHALL OAuth 토큰 발급 응답을 100ms 이내 완료한다.
- THE 시스템 SHALL 100 동시 요청을 지원한다.
- THE 시스템 SHALL 사용자에게 친숙한 한글 에러 메시지와 해결 방법을 제공한다.

## 6. 에러 처리

- IF 유효하지 않은 입력 파라미터가 포함되면, THEN THE 시스템 SHALL 명확한 한글 안내 메시지와 에러 코드를 반환한다.
- IF 인증 실패 시, THEN THE 시스템 SHALL 적절한 HTTP 401 응답 및 리커버리 안내를 제공한다.

## 7. Mermaid 다이어그램

```mermaid
graph LR
  A["OAuth 인가 요청"] --> B{"로그인 상태 확인"}
  B --|"미인증"| C["로그인 페이지로 리다이렉트"]
  B --|"인증"| D{"신뢰 클라이언트?"}
  D --|"예"| E["자동 동의 처리"]
  D --|"아니오"| F["동의 페이지 표시"]
  E --> G["인가 코드 생성 및 저장"]
  F --> G
  G --> H["클라이언트 콜백으로 코드 전달"]

  I["POST /oauth/token"] --> J["인가 코드 검증"]
  J --> K["클라이언트 인증"]
  K --> L["opaque access_token, refresh_token 발급"]
  L --> M["응답 반환"]

  N["GET /oidc/userinfo"] --> O["Bearer 토큰 검증"]
  O --> P["스코프 기반 사용자 정보 반환"]

```

## 8. 결론
본 요구사항은 OAuth 서버 구현에 필요한 비즈니스 로직, 사용자 시나리오, 보안 및 성능 조건, 운영 기능 그리고 문서화를 포함한다. 모든 요구사항은 개발자가 즉시 이해하고 적용할 수 있도록 구체적이고 명확하게 기술되었다.

> 본 문서는 비즈니스 요구사항만을 포함하며, 모든 기술적 구현 권한은 개발자에게 있다. 이 문서는 WHAT을 기술하며 HOW를 포함하지 않는다.
