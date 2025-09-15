import { tags } from "typia";

/** TechreviewerPayload: 기술 평가자 인증 대상 페이로드 (JWT) */
export interface TechreviewerPayload {
  /** 기술 평가자 고유 식별자 (ats_recruitment_techreviewers.id, UUID) */
  id: string & tags.Format<"uuid">;

  /** 역할 구분자(discriminator, 'techReviewer') */
  type: "techReviewer";
}
