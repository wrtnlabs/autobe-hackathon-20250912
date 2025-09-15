import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Update a specific assessment result by assessmentId and resultId.
 *
 * This operation updates the assessment result's score, status, and completion
 * timestamp. Only the owning corporate learner is authorized to perform the
 * update.
 *
 * @param props - Properties required for update
 * @param props.corporateLearner - The authenticated corporate learner
 *   performing the update
 * @param props.assessmentId - UUID of the assessment
 * @param props.resultId - UUID of the assessment result record
 * @param props.body - Update data containing score, status, and completed_at
 * @returns The updated assessment result record
 * @throws {Error} When the assessment result does not exist
 * @throws {Error} When the assessment result does not belong to the specified
 *   assessmentId
 * @throws {Error} When the corporate learner is not authorized to update this
 *   result
 */
export async function putenterpriseLmsCorporateLearnerAssessmentsAssessmentIdResultsResultId(props: {
  corporateLearner: CorporatelearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentResult.IUpdate;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { corporateLearner, assessmentId, resultId, body } = props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_assessment_results.findUnique({
      where: { id: resultId },
    });

  if (!existing)
    throw new Error(`Assessment result with id ${resultId} not found`);

  if (existing.assessment_id !== assessmentId) {
    throw new Error(
      `Assessment result id ${resultId} does not belong to assessment id ${assessmentId}`,
    );
  }

  if (existing.learner_id !== corporateLearner.id) {
    throw new Error(
      `Unauthorized to update assessment result: user is not the owner`,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.enterprise_lms_assessment_results.update({
      where: { id: resultId },
      data: {
        score: body.score ?? undefined,
        status: body.status ?? undefined,
        completed_at:
          body.completed_at === null ? null : (body.completed_at ?? undefined),
        updated_at: now,
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    assessment_id: updated.assessment_id as string & tags.Format<"uuid">,
    learner_id: updated.learner_id as string & tags.Format<"uuid">,
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
