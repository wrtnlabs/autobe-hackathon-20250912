import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed assessment question information
 *
 * Retrieves detailed information about a single assessment question identified
 * by questionId within the assessment identified by assessmentId. Access is
 * restricted to systemAdmin users only.
 *
 * @param props - Object containing systemAdmin payload and path parameters
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.assessmentId - UUID of the parent assessment
 * @param props.questionId - UUID of the assessment question
 * @returns The detailed assessment question entity
 * @throws {Error} Throws an error if the question is not found
 */
export async function getenterpriseLmsSystemAdminAssessmentsAssessmentIdQuestionsQuestionId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAssessmentQuestion> {
  const { systemAdmin, assessmentId, questionId } = props;

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
    deleted_at: question.deleted_at ?? undefined,
  };
}
