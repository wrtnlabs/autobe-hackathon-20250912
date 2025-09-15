import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update question details for the specified assessment and question IDs.
 *
 * This function updates an existing assessment question identified by
 * questionId belonging to a specified assessment identified by assessmentId.
 * Modifies fields such as question_text, question_type, and weight, while
 * ensuring tenant isolation and verifying ownership as per the schema.
 *
 * @param props - Object containing the authenticated organizationAdmin user,
 *   target assessmentId, questionId, and update body fields.
 * @returns Updated assessment question entity conforming to
 *   IEnterpriseLmsAssessmentQuestion.
 * @throws {Error} Throws if the question does not exist or does not belong to
 *   the assessment.
 */
export async function putenterpriseLmsOrganizationAdminAssessmentsAssessmentIdQuestionsQuestionId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentQuestion.IUpdate;
}): Promise<IEnterpriseLmsAssessmentQuestion> {
  const { organizationAdmin, assessmentId, questionId, body } = props;

  // Verify the question belonging to the assessment exists and is not deleted
  const question =
    await MyGlobal.prisma.enterprise_lms_assessment_questions.findFirst({
      where: { id: questionId, assessment_id: assessmentId, deleted_at: null },
    });

  if (!question) throw new Error("Assessment question not found");

  // Prepare update data only for provided fields
  const updateData: Partial<IEnterpriseLmsAssessmentQuestion.IUpdate> = {};

  if (body.assessment_id !== undefined)
    updateData.assessment_id = body.assessment_id;
  if (body.question_text !== undefined)
    updateData.question_text = body.question_text;
  if (body.question_type !== undefined)
    updateData.question_type = body.question_type;
  if (body.weight !== undefined) updateData.weight = body.weight;

  updateData.updated_at = toISOStringSafe(new Date());

  // Perform the update
  const updated =
    await MyGlobal.prisma.enterprise_lms_assessment_questions.update({
      where: { id: questionId },
      data: updateData,
    });

  return {
    id: updated.id,
    assessment_id: updated.assessment_id,
    question_text: updated.question_text,
    question_type: updated.question_type,
    weight: updated.weight,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
