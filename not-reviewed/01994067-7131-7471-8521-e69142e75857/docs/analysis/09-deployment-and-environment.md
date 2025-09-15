# OAuth 서버 종합 비즈니스 요구사항 및 기능 정의

## 1. 서비스 개요

### 1.1 서비스 목적

THE OAuth 서버 SHALL 네이버 수준의 5분 내 OAuth 연동 기능을 제공한다.
THE OAuth 서버 SHALL OAuth 2.0 및 OpenID Connect Core 1.0 표준을 완전히 준수한다.

### 1.2 사용자 역할

THE system SHALL 다음 역할을 지원한다.
- Guest: 비인증 사용자로 기본적인 정보 조회 및 로그인/회원가입 가능
- Member: 인증된 사용자로 프로필 관리 및 OAuth 토큰 사용 가능
- Developer: API 연동 개발자 및 OAuth 클라이언트 등록 권한 보유
- Admin: 시스템 관리자로 사용자 및 클라이언트, 감사 로그 관리 권한 보유

## 2. 데이터 모델 및 관리 정책

### 2.1 Soft Delete 정책

THE system SHALL `User` 테이블을 제외한 모든 테이블에 `deletedAt` 컬럼을 포함하여 소프트 삭제를 지원한다.

### 2.2 빈번한 컬럼 분리

THE system SHALL 닉네임, 프로필사진 등 빈번한 변경이 예상되는 컬럼을 별도의 프로필 테이블로 분리 관리한다.

## 3. 주요 기능 요구사항

### 3.1 OAuth 인가 및 토큰 발급

WHEN 클라이언트가 `/oauth/authorize` 엔드포인트로 인가 요청을 보내면,
THE system SHALL 로그인 상태를 검증한다.
IF 로그인되어 있지 않으면,
THEN THE system SHALL 로그인 페이지로 리다이렉트한다.
IF 클라이언트가 신뢰할 수 있는 클라이언트로 등록되어 있으면,
THEN THE system SHALL 사용자 동의 단계를 건너뛴다.
WHEN 인가 코드가 발급되면,
THE system SHALL 관련 정보를 JSONB 형식으로 `SimpleAuthCode` 테이블에 저장한다.

WHEN 클라이언트가 `/oauth/token` 엔드포인트로 인가 코드 교환 요청을 보내면,
THE system SHALL 인가 코드, 클라이언트 인증, `redirect_uri` 검증을 수행한다.
WHEN 검증이 완료되면,
THE system SHALL `access_token`, `id_token` 및 `refresh_token`을 불투명 토큰으로 발급한다.
THE system SHALL 토큰 생성시에 UUID, CUID, ULID 중 하나를 적절히 선택하여 사용한다.

### 3.2 사용자 인증과 프로필 관리

THE system SHALL 사용자 이메일/비밀번호 로그인과 소셜 로그인(네이버, 다음, 애플, 구글)을 지원한다.
WHEN 소셜 로그인 시 동일 이메일이 존재하면,
THE system SHALL 기존 사용자 계정과 연동한다.
THE system SHALL 사용자 프로필에 스팀 배틀그라운드, 카카오 배틀그라운드, 롤 플레이어명 등록 기능을 제공한다.
THE system SHALL 프로필 정보 중 닉네임과 프로필사진 등 빈번한 변경 항목은 별도의 프로필 테이블로 관리된다.

### 3.3 클라이언트 관리

THE system SHALL 클라이언트 등록, 수정, 삭제, 시크릿 재생성 및 리다이렉트 URI 검증 기능을 제공한다.
THE system SHALL 클라이언트 정보를 `OAuthClient` 테이블에 저장하며, `logo_url`, `is_trusted` 필드를 포함한다.

### 3.4 Redis 캐싱

THE system SHALL Redis를 활용하여 다음 데이터를 캐싱한다.
- 불투명 토큰 발급 및 검증 결과
- 사용자 정보를 UserInfo 엔드포인트 응답용으로 캐싱
- 클라이언트 정보
- 외부 게임 API 결과 (배틀그라운드, 롤 시즌별 전적 데이터)
캐시 무효화 정책과 TTL 설정이 적용된다.

### 3.5 포인트 및 쿠폰 시스템

THE system SHALL 사용자별 포인트 잔액을 관리하며, 아이콘 등 디지털 상품 구매에 활용한다.
THE system SHALL 포인트 지급 쿠폰을 제공하여 쿠폰 코드 입력 시 포인트를 충전한다.
쿠폰은 유효기간과 사용 여부를 체크하며, 관리자 UI에서 관리 가능하다.

### 3.6 외부 OAuth 공급자 연동 및 자체 OAuth 서버 이용

THE system SHALL 네이버, 다음, 애플, 구글 외부 OAuth 공급자를 연동한다.
THE system SHALL 자체 OAuth 서버를 외부 서비스가 클라이언트로 이용할 수 있게 한다.

### 3.7 배틀그라운드 및 롤 전적 검색

THE system SHALL 사용자 프로필에 배틀그라운드 및 롤 플레이어명을 등록 지원한다.
THE system SHALL 공식 API를 통해 시즌별 전적 정보를 조회하며,
조회 결과는 Redis 캐싱으로 성능 최적화한다.

## 4. 관리자 기능 및 운영

THE system SHALL 클라이언트 관리, 사용자 관리, 토큰 모니터링, 감사 로그 조회 기능을 관리 UI로 제공한다.
관리자는 배포, 보안 정책, 모니터링, 백업과 복구 작업도 수행할 수 있다.

## 5. 보안 정책

THE system SHALL HTTPS를 프로덕션에서 강제한다.
THE system SHALL PKCE 지원하며, 공개 클라이언트에선 필수이다.
THE system SHALL IP 및 클라이언트별 Rate Limiting을 실시한다.
THE system SHALL 주요 인증 및 인가 이벤트는 감사 로그로 남긴다.
THE system SHALL 민감 정보는 로그에 기록하지 않는다.

## 6. 배포 및 환경 설정

THE system SHALL Node.js 18+, PostgreSQL 13+, Docker 환경에서 동작한다.
환경변수를 통해 비밀키와 연결 정보를 관리한다.
개발 및 프로덕션용 Docker 파일과 compose 설정을 제공한다.

## 7. 성능 및 테스트 요구사항

THE system SHALL 100ms 이내 토큰 발급 응답을 보장한다.
THE system SHALL 최소 100 동시 요청을 처리할 수 있다.
자동화된 기능 및 E2E 테스트, Playwright 프론트 테스트를 포함한다.

---

```mermaid
graph LR
  A["사용자 요청 인가 코드"] --> B{"로그인 상태 확인"}
  B --|"아니오"| C["로그인 페이지 리다이렉트"]
  B --|"예"| D["클라이언트 신뢰도 확인"]
  D --> E{"신뢰 클라이언트인가?"}
  E --|"예"| F["동의 화면 생략"]
  E --|"아니오"| G["동의 화면 제공"]
  F --> H["인가 코드 생성 및 저장"]
  G --> H
  H --> I["클라이언트 콜백으로 인가 코드 전달"]

  J["토큰 발급 요청"] --> K["인가 코드 검증"]
  K --> L["클라이언트 인증"]
  L --> M["불투명 토큰 발급 (UUID, CUID, ULID 사용) "]
  M --> N["클라이언트에 토큰 반환"]

  O["UserInfo 요청"] --> P["Bearer 토큰 검증"]
  P --> Q["스코프 기반 클레임 필터링 및 반환"]

  A --> B
  C --> B
  N --> O
```


> 본 문서는 OAuth 서버의 비즈니스 요구사항을 다루며, 기술적 아키텍처, API 명세, 데이터베이스 설계 등은 개발자 재량에 맡긴다. 개발자는 본 문서를 참고하여 시스템을 구현한다.
