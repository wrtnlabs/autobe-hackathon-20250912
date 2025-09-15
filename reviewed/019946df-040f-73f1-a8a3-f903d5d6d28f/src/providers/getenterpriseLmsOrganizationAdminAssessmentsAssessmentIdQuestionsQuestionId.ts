import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get detailed assessment question information
 *
 * Retrieves detailed information about a single question identified by
 * questionId within the assessment identified by assessmentId.
 *
 * This endpoint is restricted to authorized organization administrators.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization administrator
 * @param props.assessmentId - UUID of the assessment
 * @param props.questionId - UUID of the question
 * @returns The detailed assessment question object
 * @throws {Error} When the question is not found or access is unauthorized
 */
export async function getenterpriseLmsOrganizationAdminAssessmentsAssessmentIdQuestionsQuestionId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAssessmentQuestion> {
  const { organizationAdmin, assessmentId, questionId } = props;

  const question =
    await MyGlobal.prisma.enterprise_lms_assessment_questions.findFirstOrThrow({
      where: {
        id: questionId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });

  return {
    id: question.id,
    assessment_id: question.assessment_id,
    question_text: question.question_text,
    question_type: question.question_type,
    weight: question.weight,
    created_at: toISOStringSafe(question.created_at),
    updated_at: toISOStringSafe(question.updated_at),
    deleted_at: question.deleted_at
      ? toISOStringSafe(question.deleted_at)
      : null,
  };
}
