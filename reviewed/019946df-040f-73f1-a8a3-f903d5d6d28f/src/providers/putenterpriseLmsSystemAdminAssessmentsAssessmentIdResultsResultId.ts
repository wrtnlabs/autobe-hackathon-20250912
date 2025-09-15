import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Updates an existing assessment result identified by resultId for the
 * specified assessmentId.
 *
 * This operation allows a systemAdmin to modify the score, status, and
 * completion timestamp of an assessment result in the
 * enterprise_lms_assessment_results table.
 *
 * It validates that the assessment result exists and is associated with the
 * given assessmentId. It updates only fields provided in the request body and
 * sets the updated_at timestamp.
 *
 * @param props - Object containing systemAdmin authorization, assessmentId,
 *   resultId, and update body
 * @param props.systemAdmin - Authenticated systemAdmin payload
 * @param props.assessmentId - Unique identifier of the target assessment
 * @param props.resultId - Unique identifier of the assessment result
 * @param props.body - Partial update data for assessment result
 * @returns Updated assessment result record
 * @throws {Error} When the assessment result does not exist or assessmentId
 *   mismatches
 */
export async function putenterpriseLmsSystemAdminAssessmentsAssessmentIdResultsResultId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentResult.IUpdate;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { systemAdmin, assessmentId, resultId, body } = props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_assessment_results.findUniqueOrThrow({
      where: { id: resultId },
    });

  if (existing.assessment_id !== assessmentId) {
    throw new Error("Assessment ID does not match the result's assessment_id");
  }

  const updateData = {
    score: body.score !== undefined ? body.score : undefined,
    status: body.status !== undefined ? body.status : undefined,
    completed_at:
      body.completed_at === null
        ? null
        : body.completed_at !== undefined
          ? body.completed_at
          : undefined,
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.enterprise_lms_assessment_results.update({
      where: { id: resultId },
      data: updateData,
    });

  return {
    id: updated.id,
    assessment_id: updated.assessment_id,
    learner_id: updated.learner_id,
    score: updated.score,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
