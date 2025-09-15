import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch detailed information for a specific interview question
 * (ats_recruitment_interview_questions).
 *
 * Retrieves the complete details of a specified interview question belonging to
 * the given interview session. This operation is typically used by system
 * administrators for audit, validation, or review of the specific question, and
 * returns all metadata including content, type, ordering, template origin, and
 * creation date.
 *
 * Only authenticated system administrators are permitted to use this endpoint;
 * access is strictly controlled and all operations should be audit logged for
 * compliance.
 *
 * @param props - Properties required for fetching the interview question
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.interviewId - The unique identifier for the parent interview the
 *   question must belong to
 * @param props.questionId - The unique identifier of the interview question to
 *   fetch
 * @returns The complete details of the interview question with all fields
 *   populated
 * @throws {Error} If no question with the specified IDs is found, or database
 *   error occurs
 */
export async function getatsRecruitmentSystemAdminInterviewsInterviewIdQuestionsQuestionId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewQuestion> {
  const { interviewId, questionId } = props;
  const question =
    await MyGlobal.prisma.ats_recruitment_interview_questions.findFirstOrThrow({
      where: { id: questionId, ats_recruitment_interview_id: interviewId },
      select: {
        id: true,
        ats_recruitment_interview_id: true,
        order: true,
        question_text: true,
        question_type: true,
        is_template: true,
        created_at: true,
      },
    });
  return {
    id: question.id,
    ats_recruitment_interview_id: question.ats_recruitment_interview_id,
    order: question.order,
    question_text: question.question_text,
    question_type: question.question_type,
    is_template: question.is_template,
    created_at: toISOStringSafe(question.created_at),
  };
}
