import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create a new interview question for a specific interview
 * (ats_recruitment_interview_questions)
 *
 * This API endpoint allows an HR recruiter to append a new interview question
 * to an existing interview event. It enforces that only authorized HR users may
 * perform this operation, and applies detailed business logic:
 *
 * - The specified interview must exist and not be deleted.
 * - It must be in a modifiable state (not cancelled).
 * - The new question's order must not conflict with existing questions for the
 *   interview.
 * - All fields must strictly match the business and schema constraints, with
 *   proper type/shape.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - Authenticated HR recruiter (role enforced by
 *   decorator)
 * @param props.interviewId - Unique identifier of the parent interview
 * @param props.body - Question creation details (order, content, type, template
 *   state)
 * @returns The newly created interview question entity, as persisted
 * @throws {Error} If the interview does not exist, is not modifiable, or a
 *   duplicate order exists
 */
export async function postatsRecruitmentHrRecruiterInterviewsInterviewIdQuestions(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewQuestion.ICreate;
}): Promise<IAtsRecruitmentInterviewQuestion> {
  // 1. Verify the parent interview exists and is not deleted
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: props.interviewId,
      deleted_at: null,
    },
  });
  if (!interview) {
    throw new Error("Interview not found or deleted");
  }
  // 2. Interview must not be locked (business logic; cancelled interview not modifiable)
  if (interview.status === "cancelled") {
    throw new Error("Cannot add questions to a non-modifiable interview");
  }
  // 3. Prevent duplicate question order for this interview
  const existing =
    await MyGlobal.prisma.ats_recruitment_interview_questions.findFirst({
      where: {
        ats_recruitment_interview_id: props.interviewId,
        order: props.body.order,
      },
    });
  if (existing) {
    throw new Error(
      "Duplicate order: question already exists at this order for the interview",
    );
  }
  // 4. Insert the new interview question with generated UUID and timestamp
  const id: string & tags.Format<"uuid"> = v4();
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.ats_recruitment_interview_questions.create({
    data: {
      id,
      ats_recruitment_interview_id: props.interviewId,
      order: props.body.order,
      question_text: props.body.question_text,
      question_type: props.body.question_type,
      is_template: props.body.is_template,
      created_at,
    },
  });
  // 5. Return the typed result - immutable and DTO-conformant
  return {
    id,
    ats_recruitment_interview_id: props.interviewId,
    order: props.body.order,
    question_text: props.body.question_text,
    question_type: props.body.question_type,
    is_template: props.body.is_template,
    created_at,
  };
}
