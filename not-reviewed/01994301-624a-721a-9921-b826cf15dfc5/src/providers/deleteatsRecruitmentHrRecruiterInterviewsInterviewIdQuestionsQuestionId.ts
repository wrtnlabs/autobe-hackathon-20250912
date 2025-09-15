import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Permanently remove an interview question for a given interview
 * (ats_recruitment_interview_questions)
 *
 * This operation deletes a specific question from the given interview, after
 * verifying ownership and interview state. The HR recruiter must own the
 * interview and it must not be in progress or completed. Deletion is permanent;
 * there is no soft-delete for interview questions.
 *
 * @param props.hrRecruiter - Authenticated HR recruiter payload (must own the
 *   interview)
 * @param props.interviewId - The UUID for the parent interview
 * @param props.questionId - The UUID for the question to remove
 * @returns Void
 * @throws {Error} If the interview or question is not found, the user is
 *   unauthorized, or the interview is locked
 */
export async function deleteatsRecruitmentHrRecruiterInterviewsInterviewIdQuestionsQuestionId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Ensure the question exists and belongs to the provided interview.
  const question =
    await MyGlobal.prisma.ats_recruitment_interview_questions.findFirst({
      where: {
        id: props.questionId,
        ats_recruitment_interview_id: props.interviewId,
      },
    });
  if (!question)
    throw new Error("Interview question not found for the specified interview");

  // 2. Ensure the interview exists.
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: { id: props.interviewId },
  });
  if (!interview) throw new Error("Interview not found");

  // 3. Fetch the application, then the job posting to check recruiter ownership.
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findUnique({
      where: { id: interview.ats_recruitment_application_id },
      select: { job_posting_id: true },
    });
  if (!application) throw new Error("Application not found for this interview");
  const jobPosting =
    await MyGlobal.prisma.ats_recruitment_job_postings.findUnique({
      where: { id: application.job_posting_id },
      select: { hr_recruiter_id: true },
    });
  if (!jobPosting) throw new Error("Job posting not found for application");
  if (jobPosting.hr_recruiter_id !== props.hrRecruiter.id) {
    throw new Error(
      "Unauthorized: only the interview's HR recruiter may remove questions",
    );
  }
  // 4. Disallow deletion if interview is completed or in progress
  if (["completed", "in_progress"].includes(interview.status)) {
    throw new Error(
      "Cannot delete interview questions from completed or in-progress interviews",
    );
  }
  // 5. Hard delete the question (permanently removed)
  await MyGlobal.prisma.ats_recruitment_interview_questions.delete({
    where: { id: props.questionId },
  });
}
