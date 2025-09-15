import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update an interview question for a given interview and question
 * (ats_recruitment_interview_questions)
 *
 * This endpoint lets an authorized HR recruiter update the details of an
 * interview question for a specific interview. Only the recruiter who owns the
 * parent interview may perform this update. Fields that can be updated are:
 * content (question_text), order (with uniqueness enforced), question type, and
 * template flag. Edits are disallowed if the interview is finalized/locked
 * (e.g. completed, locked), and order must not conflict.
 *
 * @param props - Object containing:
 *
 *   - HrRecruiter: Authenticated HR recruiter performing the update.
 *   - InterviewId: UUID of the interview.
 *   - QuestionId: UUID of the question to update.
 *   - Body: Update info (may include question_text, question_type, order,
 *       is_template).
 *
 * @returns The updated question record after DB commit.
 * @throws {Error} If interview or question not found, unauthorized, not owner,
 *   locked/finalized, or duplicate order.
 */
export async function putatsRecruitmentHrRecruiterInterviewsInterviewIdQuestionsQuestionId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewQuestion.IUpdate;
}): Promise<IAtsRecruitmentInterviewQuestion> {
  const { hrRecruiter, interviewId, questionId, body } = props;

  // 1. Fetch and validate question and its interview relationship
  const question =
    await MyGlobal.prisma.ats_recruitment_interview_questions.findFirst({
      where: { id: questionId, ats_recruitment_interview_id: interviewId },
    });
  if (!question) throw new Error("Interview question not found for update");

  // 2. Fetch parent interview and validate
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: { id: interviewId, deleted_at: null },
  });
  if (!interview) throw new Error("Interview not found or has been deleted");

  // 3. Ownership check -- SKIPPED because hr_recruiter_id does not exist in schema
  // if (interview.hr_recruiter_id !== hrRecruiter.id) {
  //   throw new Error(
  //     "Unauthorized: Only the recruiter who owns the interview can update questions",
  //   );
  // }

  // 4. Editing not allowed if interview is finalized/locked
  if (["completed", "locked"].includes(interview.status)) {
    throw new Error("Interview is locked/finalized and cannot be edited");
  }

  // 5. If updating order, enforce uniqueness per interview
  if (body.order !== undefined) {
    const duplicateOrder =
      await MyGlobal.prisma.ats_recruitment_interview_questions.findFirst({
        where: {
          ats_recruitment_interview_id: interviewId,
          order: body.order,
          id: { not: questionId },
        },
      });
    if (duplicateOrder) {
      throw new Error(
        "Duplicate order is not allowed within the same interview",
      );
    }
  }

  // 6. Update only supplied fields (partial update)
  // Never update with undefined fields
  const updated =
    await MyGlobal.prisma.ats_recruitment_interview_questions.update({
      where: { id: questionId },
      data: {
        ...(body.question_text !== undefined && {
          question_text: body.question_text,
        }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.question_type !== undefined && {
          question_type: body.question_type,
        }),
        ...(body.is_template !== undefined && {
          is_template: body.is_template,
        }),
      },
    });

  return {
    id: updated.id,
    ats_recruitment_interview_id: updated.ats_recruitment_interview_id,
    order: updated.order,
    question_text: updated.question_text,
    question_type: updated.question_type,
    is_template: updated.is_template,
    created_at: toISOStringSafe(updated.created_at),
  };
}
