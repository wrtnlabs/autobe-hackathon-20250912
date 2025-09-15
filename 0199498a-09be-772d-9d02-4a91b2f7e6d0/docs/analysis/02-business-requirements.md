# StoryField AI Server 비즈니스 요구사항 정의서

## 1. 비즈니스 요구사항 요약
StoryField AI Server는 사용자가 텍스트 또는 오디오로 동화를 손쉽게 생성할 수 있게 하는 AI 기반 서비스이다. 본 시스템은 "Spring Backend"를 통한 엄격한 인증 하에 동화 생성, 이미지·텍스트 결과 제공, 합성음성(TTS) 및 사투리 변환 기능을 제공한다. 모든 미디어 파일 업로드·결과 조회 등은 지정된 Spring API를 통해 간접적으로 이루어지며, 외부 AI API(예: OpenAI)와 연동된다.

### 주요 기능 요약
- 입력 텍스트 또는 오디오에서 동화 및 동화 이미지 자동 생성(각 15개 단위)
- 동화 결과 미디어 자동 Spring 통해 S3 업로드 & 관리
- 동화 본문 및 페이지별 이미지 반환
- TTS 합성 및 사투리 변환(TTS)
- 인증 기반 서비스 접근 및 추후 확장 가능한 권한 구조
- MVP 기준 성능·보안·컴플라이언스 요구 반영

### 사용자(Role) 정의
| 사용자 유형           | 설명 및 권한 요약 |
|----------------------|-------------------|
| authenticatedUser    | 정상적으로 Spring 인증을 받은 회원. 동화 생성, TTS/사투리 요청, 자신의 결과 접근 일체 가능. 모든 기능 접근은 로그인된 토큰(AccessToken) 소지자만 가능. |
| systemAdmin          | 시스템 운영∙모니터링, Abuse 관리, 외부 연동·토큰 체계 관리 등 전권한 보유. 로그∙사용자 관리, 감사 기능 등 부가 관리자 권한 수행 |

## 2. 기능적 요구사항 (EARS 형식)

### 동화 생성 및 콘텐트 기능
- WHEN authenticatedUser가 텍스트 기반의 동화 생성을 요청하면, THE storyfieldAi 서비스 SHALL 15개의 동화 텍스트와 15개 동화 이미지를 자동으로 생성한다.
- WHEN authenticatedUser가 오디오 기반의 동화 생성을 요청하면, THE storyfieldAi 서비스 SHALL 음성을 텍스트로 변환하고, 15개의 동화 텍스트와 15개 동화 이미지를 생성한다.
- WHEN 동화 이미지 또는 음성 파일이 생성되면, THE storyfieldAi 서비스 SHALL 이를 Spring 백엔드 API를 통해 S3로 업로드하고, 최종 결과 URL을 받아 사용자에게 반환한다.
- WHEN 동화(TTS) 읽기 요청이 들어오면, THE storyfieldAi 서비스 SHALL 해당 텍스트를 음성으로 변환 후, S3로 업로드/최종 URL을 반환한다.
- WHEN 사투리 변환 TTS 요청이 들어오면, THE storyfieldAi 서비스 SHALL 입력 문장을 해당 사투리(예: 경상도/전라도)로 변환한 음성을 생성한다.

### 테스트용 목업 기능
- WHEN /test/stories/from-text 또는 /test/stories/from-audio 개발용 엔드포인트에 요청이 들어오면, THE storyfieldAi 서비스 SHALL 동일 응답 스키마로 dummy 이미지 및 텍스트 데이터를 반환한다.

### 접근 통제 및 인증 요구
- THE storyfieldAi 서비스 SHALL 모든 주요 동화 생성/TTS/사투리 기능에 대해 Spring에서 발급한 AccessToken의 유효성 검증을 거쳐서만 요청을 처리한다.
- IF 인증되지 않은 토큰이거나 만료/조작된 토큰일 경우, THEN THE storyfieldAi 서비스 SHALL 요청을 거절하고 관련 에러 코드를 반환한다.
- WHEN 인증이 성공적으로 처리된 경우에만, THE storyfieldAi 서비스 SHALL 해당 사용자에 한해 기능을 제공한다.
- WHILE systemAdmin이 접근하는 경우, THE storyfieldAi 서비스 SHALL Abuse 로그 열람, 토큰 강제 만료, 외부 연동 설정 등의 고급 권한 기능을 제공한다.

### 외부 연동/업로드 요구
- WHEN 미디어 파일(S3 업로드 활용)이 필요한 경우, THE storyfieldAi 서비스 SHALL Spring API 명세에 따라 Authorization 헤더(Bearer)와 multipart/form-data 형식으로 연동한다.
- WHEN AI API(Key/Token 기반)와 통신 시, THE storyfieldAi 서비스 SHALL 환경별 .env.* 파일에서 각종 외부 연동키를 안전하게 조회 및 관리한다.

## 3. 비기능적 요구사항 (EARS 형식)

### 성능 및 확장성
- THE storyfieldAi 서비스 SHALL 일반적인 동화 생성/응답 요청에 대해 5초 이내(최대 10초 미만)로 결과를 반환한다.
- THE storyfieldAi 서비스 SHALL 1분 내 최대 15건의 동시 동화 생성 요청을, 성능 저하 없이 처리할 수 있어야 한다.
- WHEN 서버 부하가 임계 이상 감지되면, THE storyfieldAi 서비스 SHALL 신규 동화 생성/합성 요청을 임시 중단하고, 적절한 부하 안내 메시지를 제공한다.

### 신뢰성·가용성·모니터링
- THE storyfieldAi 서비스 SHALL 연속 오류 3회 이상 탐지 시 관리자 알림을 자동으로 요청한다.
- THE storyfieldAi 서비스 SHALL 중요 장애(동화 생성 실패, 파일 업로드 실패 등) 시, 실패 사유와 참고 코드를 로그에 영구 기록한다.
- WHEN 외부 AI API/Spring 서버 통신이 불안정하거나 시간 초과 시, THE storyfieldAi 서비스 SHALL 재시도 로직(최소 2회)과 대체 안내 메시지를 사용자에게 제공한다.

### 사용성(UX), 이중화
- WHEN 사용자 입력 값이 유실, 잘못된 포맷(예: 음성파일 포맷 불일치)인 경우, THE storyfieldAi 서비스 SHALL 즉시 입력 오류 구체 메시지를 반환한다.
- THE storyfieldAi 서비스 SHALL 단일 장애 지점(SPOF, single point of failure) 없는 설계 원칙을 따라야 한다.

### 환경 구성 및 배포
- WHEN 운영/개발 환경 전환이 필요할 때, THE storyfieldAi 서비스 SHALL .env.local, .env.development, .env.production 파일을 통해 주요 환경변수를 안전하게 구분 관리한다.
- WHEN 도커(Docker, docker-compose)를 사용해 배포할 때, THE storyfieldAi 서비스 SHALL 환경별(-dev,-prod) 일관된 실행·롤백·설정 반영이 가능해야 한다.

## 4. 컴플라이언스 및 데이터 보안
- THE storyfieldAi 서비스 SHALL Spring 사용자 인증 정보를 Redis 기반 세션 관리와 연동해 처리한다.
- WHEN 사용자·생성 데이터 접근/반환 시, THE storyfieldAi 서비스 SHALL 부적절한 접근(타인 데이터 요청, 시스템 권한 미만 등)을 거부한다.
- THE storyfieldAi 서비스 SHALL 모든 토큰/API Key/민감 데이터는 환경변수와 안전 메커니즘에 의해 마스킹 및 비노출 저장한다.
- WHEN 미디어(S3) URL 등 외부 리소스 접근이 필요한 경우, THE storyfieldAi 서비스 SHALL Presigned URL, 권한 검증된 URL만 사용자에게 제공한다.
- WHEN 법령/회사 정책 상 데이터 삭제가 요구될 시, THE storyfieldAi 서비스 SHALL 관련 S3·로그·Token 등 전 데이터를 안전하게 삭제 및 갱신 처리한다.
- THE storyfieldAi 서비스 SHALL 자동화된 Abuse, 콘텐트 불법사용 모니터링(예정) 기능 확장을 고려할 수 있다.

## 5. 수용 기준 (Acceptance Criteria)
- 모든 동화 생성 및 TTS/사투리 기능은 오직 인증된 사용자의 요청에 한해 정확히 동작해야 한다.
- 모든 결과 리소스(S3 이미지/오디오 URL 등)는 Spring API를 통한 업로드 및 최종 URL 반환을 거쳐야 한다.
- 응답/결과 데이터 포맷 및 구조는 요구 요구사항(EARS)에 명시된 바와 완전히 일치한다.
- 비정상/에러 상황은 상세 코드 및 메시지와 함께 사용자에게 즉시 알리고, 관리자(시스템운영자)에게 필요시 통보된다.
- 환경파일, 도커 기반 배포, 인증·권한 관리 모두 비즈니스 요구조건 대로 정확히 분리 및 관리된다.
- 개인정보·민감 정보, 외부 Key, User Token 등은 절대 노출되지 않는다.
- 컴플라이언스, 데이터 보안, 법적 이슈(콘텐츠 생산물, 이용자 데이터) 요구가 완전 반영되었음이 증명되어야 한다.
- 모든 신규 기능·권한 추가가 발생하는 경우 본 문서(EARS 형식) 요구사항 추가/수정에 기반한다.
