import { tags } from "typia";

/**
 * 지원자 인증 JWT 페이로드 타입.
 *
 * - Id: 최상위 지원자 테이블(ats_recruitment_applicants)의 UUID
 * - Type: 인증 토큰 롤 구분자 (const 'applicant')
 */
export interface ApplicantPayload {
  /** 최상위 사용자 테이블의 ID (UUID). */
  id: string & tags.Format<"uuid">;

  /** 역할 식별자(디스크리미네이터). */
  type: "applicant";
}
