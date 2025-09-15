import { tags } from "typia";

/** HR리크루터용 페이로드 타입(최상위 식별자는 HR리크루터 테이블 PK) */
export interface HrrecruiterPayload {
  /** HR 리크루터 테이블 고유 ID (UUID) */
  id: string & tags.Format<"uuid">;
  /** 타입 식별자 ('hrRecruiter') */
  type: "hrRecruiter";
}
