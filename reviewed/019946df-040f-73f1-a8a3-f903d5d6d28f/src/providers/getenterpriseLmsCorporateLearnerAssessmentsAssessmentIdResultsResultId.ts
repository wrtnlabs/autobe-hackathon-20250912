import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve a specific assessment result by assessmentId and resultId.
 *
 * This function fetches the detailed assessment result information for the
 * requested assessmentId and resultId, constrained to the authenticated
 * corporateLearner's ownership.
 *
 * Authorization: Only the authenticated corporateLearner may access their own
 * assessment results.
 *
 * @param props - Object containing corporateLearner payload and identifying IDs
 * @param props.corporateLearner - Authenticated corporateLearner user payload
 * @param props.assessmentId - UUID of the assessment to which the result
 *   belongs
 * @param props.resultId - UUID of the assessment result to retrieve
 * @returns Promise resolving to the detailed assessment result record
 * @throws {Error} Throws if no matching result found or unauthorized access
 */
export async function getenterpriseLmsCorporateLearnerAssessmentsAssessmentIdResultsResultId(props: {
  corporateLearner: CorporatelearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { corporateLearner, assessmentId, resultId } = props;

  const found =
    await MyGlobal.prisma.enterprise_lms_assessment_results.findFirstOrThrow({
      where: {
        id: resultId,
        assessment_id: assessmentId,
        learner_id: corporateLearner.id,
        deleted_at: null,
      },
    });

  return {
    id: found.id,
    assessment_id: found.assessment_id,
    learner_id: found.learner_id,
    score: found.score,
    completed_at: found.completed_at
      ? toISOStringSafe(found.completed_at)
      : null,
    status: found.status,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
