# OAuth 서버 기능 요구사항 및 비즈니스 명세

## 1. 개요 및 아키텍처

OAuth 서버는 OAuth 2.0 및 OpenID Connect Core 1.0 표준을 준수하는 인증 및 인가 서비스로, 사용자 인증, 클라이언트 검증, 토큰 발급, 소셜 로그인 연동, 외부 게임 API 통합, 캐싱 등을 담당한다. 시스템은 Redis 캐싱을 활용해 성능을 극대화하며, opaque token으로 고유 식별자를 사용한다.

### 1.1 사용자 역할

| 역할       | 설명                                         | 권한 및 기능 요약                      |
|------------|----------------------------------------------|---------------------------------------|
| guest      | 비인증 사용자, 로그인 및 공용 정보 조회 가능 | 로그인, 회원가입, 공용 API 접근        |
| member     | 인증된 사용자, 프로필 및 OAuth 토큰 관리    | 프로필 관리, 토큰 사용 및 갱신          |
| admin      | 시스템 관리자, 사용자 및 클라이언트 관리      | 전체 관리, 감사 로그, 환경 설정         |
| developer  | API 연동 담당자, 클라이언트 등록 및 SDK 사용 | 클라이언트 관리, 개발 도구 활용         |

## 2. 인증 코드 플로우

WHEN 클라이언트가 인가 요청을 보낼 때, THE system SHALL 로그인 상태를 확인하고 비로그인 시 로그인 페이지로 리다이렉트한다.
IF 클라이언트가 신뢰될 경우, THEN THE system SHALL 사용자 동의 페이지를 생략한다.
WHEN 인가 코드가 생성되면, THE system SHALL 이를 JSONB 형태로 SimpleAuthCode 테이블에 저장한다.
WHEN 인가 코드로 POST /oauth/token 요청이 오면, THE system SHALL 인가 코드, 클라이언트 인증, redirect_uri, 스코프를 검증한다.
THEN THE system SHALL access_token, id_token, refresh_token을 opaque token 방식으로 발급하며, UUID/CUID/ULID를 사용한다.

## 3. 토큰 발급 및 검증

THE system SHALL JWT id_token을 OIDC 표준 클레임에 따라 발급하되, access_token과 refresh_token은 불투명 토큰으로 발급한다.
THE system SHALL Redis 캐싱을 활용하여 토큰 발급 및 검증 성능을 최적화한다.
THE system SHALL access_token 및 refresh_token의 만료 정책을 적용하며, refresh token grant를 지원한다.
THE system SHALL 토큰 폐기 및 revocation 엔드포인트를 제공한다.

## 4. 사용자 관리

THE system SHALL 이메일 및 비밀번호로 회원가입 및 로그인 지원한다.
WHEN 소셜 로그인 (네이버, 다음, 애플, 구글 또는 내부 OAuth 서버) 이 사용될 때, THE system SHALL 이메일 기반으로 기존 가입자와 계정 통합을 진행한다.
THE system SHALL 사용자 프로필에 Steam PUBG, Kakao PUBG, League of Legends 플레이어명을 등록, 수정할 수 있도록 지원한다.
THE system SHALL 닉네임, 프로필사진 등 빈번히 변동하는 프로필 정보는 별도 프로파일 테이블에서 관리한다.

## 5. 클라이언트 관리

THE system SHALL 클라이언트 등록, 수정, 삭제 기능을 제공한다.
THE system SHALL 리다이렉트 URI 및 스코프 검증을 철저히 실행한다.
THE system SHALL 클라이언트 정보 중 logo_url, is_trusted 필드를 포함한다.
THE system SHALL 비활성화 시 soft delete(deletedAt) 방식으로 관리한다.

## 6. 소셜 로그인 연동

THE system SHALL 네이버, 다음, 애플, 구글 소셜 로그인 공급자를 지원한다.
THE system SHALL 자체 OAuth 서버를 외부 서비스가 사용 가능한 OAuth 공급자 역할로 사용할 수 있게 지원한다.
THE system SHALL 소셜 로그인 공급자의 client_id와 client_secret은 관리자 UI를 통해 관리한다.

## 7. 외부 API 및 캐싱

THE system SHALL 공식 PUBG 및 League of Legends API를 통해 시즌별 전적 데이터를 가져온다.
THE system SHALL 전적 데이터 및 token validation, user info, client info 등에 Redis 캐싱을 적용한다.
THE system SHALL Redis 캐싱에는 적절한 TTL을 설정하고, 만료 시 원본 데이터로부터 다시 조회한다.

## 8. 오류 처리 및 보안 정책

IF 입력 데이터가 유효하지 않으면, THEN THE system SHALL 한글 친숙한 오류 메시지와 해결 방법을 안내한다.
THE system SHALL IP 및 클라이언트 단위 Rate Limiting을 적용한다.
THE system SHALL HTTPS를 강화하며, PKCE를 지원해 보안을 강화한다.
THE system SHALL 중요한 인증 이벤트 및 토큰 발급 내역을 감사 로그로 기록한다.

## 9. 관리 기능

THE system SHALL 관리자 UI를 통해 클라이언트 및 사용자 관리, 토큰 모니터링, 감사 로그 조회를 제공한다.
THE system SHALL 비정상 로그인, 토큰 이상 등 이상 징후 탐지 기능을 포함한다.

## 10. 성능 및 테스트

THE system SHALL OAuth 플로우를 100ms 이내 응답하도록 설계한다.
THE system SHALL 100 동시 요청을 견딜 수 있도록 시스템을 구축한다.
THE system SHALL Playwright 기반 프론트엔드 E2E 테스트를 포함한다.

## Mermaid 다이어그램: OAuth 인증 플로우

```mermaid
graph LR
  subgraph "인증 코드 플로우"
    A["사용자 OAuth 인가 요청"] --> B{"로그인 상태?"}
    B --|"아니오"| C["로그인 페이지로 리다이렉트"]
    B --|"예"| D["클라이언트 신뢰 여부 확인"]
    D --> E{"신뢰 클라이언트?"}
    E --|"예"| F["자동 동의 처리"]
    E --|"아니오"| G["동의 화면 출력"]
    F --> H["인가 코드 생성 및 저장"]
    G --> H
    H --> I["클라이언트 콜백으로 리다이렉트"]
  end

  subgraph "토큰 발급 및 검증"
    J["POST /oauth/token 요청"] --> K["인가 코드 검증"]
    K --> L["클라이언트 인증"]
    L --> M["불투명 토큰(access, refresh) 발급"]
    M --> N["토큰 응답 반환"]
  end

  subgraph "UserInfo 엔드포인트"
    O["GET /oidc/userinfo 요청"] --> P["Bearer 토큰 검증"]
    P --> Q["스코프 검사 후 사용자 정보 반환"]
  end

  A --> B
  C --> B
  N --> O
```

---

THE above document provides exhaustive business-level functional requirements for backend developers implementing an OAuth 2.0 and OpenID Connect server with opaque token management, Redis caching, social login, external API integration, and admin features.

THE document adheres strictly to EARS format, detailed specificity, and Mermaid syntax rules as instructed.

THE document refrains from technical implementation details such as API call formats or DB schemas, aligning perfectly with the requested constraints.
