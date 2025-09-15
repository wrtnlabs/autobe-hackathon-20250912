import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Fetch detailed information for a specific interview question
 * (ats_recruitment_interview_questions).
 *
 * This operation retrieves the complete details of a specific interview
 * question assigned to a particular interview session, referencing the
 * ats_recruitment_interview_questions table. It is typically used for reviewing
 * or preparing for interviews, and is accessible by HR, system administrators,
 * and relevant participants.
 *
 * Only the recruiter responsible for the interview may access this resource.
 * Attempts to access a question for interviews owned by another recruiter will
 * result in an Unauthorized error. Requests for deleted interviews or deleted
 * questions yield Not Found. Soft-deleted records are excluded by default.
 *
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 *   (must own the interview)
 * @param props.interviewId - The unique identifier of the parent interview for
 *   this question.
 * @param props.questionId - The unique identifier of the interview question to
 *   retrieve.
 * @returns The full detail object of the requested interview question,
 *   including text, type, origin, order, and metadata.
 * @throws {Error} If the interview or question cannot be found, or recruiter is
 *   not authorized.
 */
export async function getatsRecruitmentHrRecruiterInterviewsInterviewIdQuestionsQuestionId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewQuestion> {
  const { hrRecruiter, interviewId, questionId } = props;

  // Fetch the question (scalar only)
  const question =
    await MyGlobal.prisma.ats_recruitment_interview_questions.findFirst({
      where: {
        id: questionId,
        ats_recruitment_interview_id: interviewId,
      },
    });
  if (!question) {
    throw new Error("Interview question not found");
  }
  // Fetch the parent interview for soft-delete and ownership verification
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: interviewId },
    },
  );
  if (!interview || interview.deleted_at !== null) {
    throw new Error("Interview question not found");
  }
  // Fix: hr_recruiter_id must be checked on the interview object, which has property 'hr_recruiter_id'
  if ((interview as any).hr_recruiter_id !== hrRecruiter.id) {
    throw new Error(
      "Unauthorized: You may only access questions for interviews you own",
    );
  }
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
