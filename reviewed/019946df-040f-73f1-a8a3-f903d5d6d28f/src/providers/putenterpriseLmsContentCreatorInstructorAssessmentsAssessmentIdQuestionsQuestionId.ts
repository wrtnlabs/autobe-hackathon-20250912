import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update an existing question details under a specified assessment.
 *
 * This operation updates an existing assessment question identified by
 * questionId belonging to a specified assessment identified by assessmentId. It
 * modifies fields such as question_text, question_type, and weight.
 *
 * @param props - Request properties including authentication, path parameters,
 *   and update body
 * @returns The updated assessment question entity
 * @throws {Error} When the assessment question is not found
 * @throws {Error} When the assessment ID does not match
 */
export async function putenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdQuestionsQuestionId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentQuestion.IUpdate;
}): Promise<IEnterpriseLmsAssessmentQuestion> {
  const { contentCreatorInstructor, assessmentId, questionId, body } = props;

  const question =
    await MyGlobal.prisma.enterprise_lms_assessment_questions.findUnique({
      where: { id: questionId },
    });

  if (!question) throw new Error("Assessment question not found");

  if (question.assessment_id !== assessmentId)
    throw new Error("Assessment ID mismatch");

  const updated =
    await MyGlobal.prisma.enterprise_lms_assessment_questions.update({
      where: { id: questionId },
      data: {
        ...(body.assessment_id !== undefined && {
          assessment_id: body.assessment_id,
        }),
        ...(body.question_text !== undefined && {
          question_text: body.question_text,
        }),
        ...(body.question_type !== undefined && {
          question_type: body.question_type,
        }),
        ...(body.weight !== undefined && { weight: body.weight }),
        updated_at: toISOStringSafe(new Date()),
      },
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
