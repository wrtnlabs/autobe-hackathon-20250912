import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new assessment result for a specific assessment within the
 * Enterprise LMS.
 *
 * This operation records a learner's attempt, score, and completion status.
 *
 * Authorization requires a valid organization administrator.
 *
 * @param props - Object containing the organizationAdmin user, assessmentId,
 *   and request body.
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload.
 * @param props.assessmentId - UUID of the target assessment.
 * @param props.body - Assessment result creation data including learner ID,
 *   score, status, and optional completion timestamp.
 * @returns The newly created assessment result record conforming to
 *   IEnterpriseLmsAssessmentResult.
 * @throws {Error} If the assessment or learner is not found.
 */
export async function postenterpriseLmsOrganizationAdminAssessmentsAssessmentIdResults(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentResult.ICreate;
}): Promise<IEnterpriseLmsAssessmentResult> {
  const { organizationAdmin, assessmentId, body } = props;

  // Validate existence of the assessment
  const assessment =
    await MyGlobal.prisma.enterprise_lms_assessments.findUnique({
      where: { id: assessmentId },
    });
  if (!assessment) {
    throw new Error("Assessment not found");
  }

  // Validate existence of the learner
  const learner =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUnique({
      where: { id: body.learner_id },
    });
  if (!learner) {
    throw new Error("Learner not found");
  }

  // Create the assessment result
  const created =
    await MyGlobal.prisma.enterprise_lms_assessment_results.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        assessment_id: assessmentId,
        learner_id: body.learner_id,
        score: body.score,
        completed_at: body.completed_at ?? undefined,
        status: body.status,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return the newly created assessment result
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
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
