import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Creates a new assessment question linked to a specified assessment.
 *
 * This function enforces tenant isolation by verifying the assessment belongs
 * to the calling organizationAdmin user's tenant.
 *
 * @param props - Object containing organizationAdmin info, assessmentId, and
 *   question data
 * @param props.organizationAdmin - Authenticated organizationAdmin payload
 * @param props.assessmentId - UUID of the assessment to link question
 * @param props.body - Question creation data conforming to
 *   IEnterpriseLmsAssessmentQuestion.ICreate
 * @returns The newly created assessment question entity
 * @throws {Error} If the assessment does not exist or does not belong to the
 *   tenant
 */
export async function postenterpriseLmsOrganizationAdminAssessmentsAssessmentIdQuestions(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentQuestion.ICreate;
}): Promise<IEnterpriseLmsAssessmentQuestion> {
  const { organizationAdmin, assessmentId, body } = props;

  // Verify assessment existence and tenant ownership
  const assessment = await MyGlobal.prisma.enterprise_lms_assessments.findFirst(
    {
      where: {
        id: assessmentId,
        tenant_id: organizationAdmin.tenant_id,
        deleted_at: null,
      },
    },
  );

  if (!assessment) {
    throw new Error("Assessment not found or access denied");
  }

  // Generate new UUID and current timestamp in ISO format
  const id = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create new assessment question record
  const created =
    await MyGlobal.prisma.enterprise_lms_assessment_questions.create({
      data: {
        id,
        assessment_id: body.assessment_id,
        question_text: body.question_text,
        question_type: body.question_type,
        weight: body.weight,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    assessment_id: created.assessment_id,
    question_text: created.question_text,
    question_type: created.question_type,
    weight: created.weight,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
