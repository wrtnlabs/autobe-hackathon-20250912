import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific assessment result by assessmentId and resultId.
 *
 * This operation fetches the detailed assessment result record identified by
 * the given resultId and associated with the specified assessmentId. It ensures
 * soft-deleted records are excluded by checking 'deleted_at' is null. The
 * returned data includes scores, status, completion timestamps, and audit
 * timestamps.
 *
 * System admin authorization is required to access this endpoint.
 *
 * @param props - Object containing the system admin payload, assessmentId, and
 *   resultId.
 * @param props.systemAdmin - Authenticated system admin performing the
 *   operation.
 * @param props.assessmentId - UUID of the target assessment.
 * @param props.resultId - UUID of the assessment result to retrieve.
 * @returns The detailed assessment result matching the specified IDs.
 * @throws {Error} Throws if the assessment result is not found or does not
 *   belong to the assessment.
 */
export async function getenterpriseLmsSystemAdminAssessmentsAssessmentIdResultsResultId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { systemAdmin, assessmentId, resultId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_assessment_results.findFirstOrThrow({
      where: {
        id: resultId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    assessment_id: record.assessment_id,
    learner_id: record.learner_id,
    score: record.score,
    completed_at: record.completed_at ?? undefined,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ?? undefined,
  };
}
