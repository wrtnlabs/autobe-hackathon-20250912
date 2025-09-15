import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Creates a new assessment result for a specific assessment in the Enterprise
 * LMS.
 *
 * This operation records a learner's attempt, score, and completion status
 * under the given assessment.
 *
 * @param props - Object containing the authenticated system admin payload, the
 *   target assessment ID, and the assessment result creation data.
 * @param props.systemAdmin - The authenticated system admin performing the
 *   operation.
 * @param props.assessmentId - UUID of the assessment to attach the result to.
 * @param props.body - Request body carrying assessment result creation
 *   information.
 * @returns The created assessment result record, including timestamps and soft
 *   deletion status.
 * @throws Error if the creation operation fails.
 */
export async function postenterpriseLmsSystemAdminAssessmentsAssessmentIdResults(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentResult.ICreate;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { systemAdmin, assessmentId, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.enterprise_lms_assessment_results.create({
      data: {
        id: v4(),
        assessment_id: assessmentId,
        learner_id: body.learner_id,
        score: body.score,
        completed_at: body.completed_at ?? undefined,
        status: body.status,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    assessment_id: created.assessment_id,
    learner_id: created.learner_id,
    score: created.score,
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
