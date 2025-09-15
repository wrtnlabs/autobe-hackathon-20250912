import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Permanently deletes a feedback entry for a job application.
 *
 * This operation allows the authorized HR recruiter (or technical reviewer) to
 * permanently remove a feedback record from the
 * AtsRecruitmentApplicationFeedback table, identified by applicationId and
 * feedbackId. Only the original feedback author is permitted to perform this
 * hard delete. There is no soft delete; feedback is unrecoverably erased. If
 * the feedback does not exist for the application, or the user does not own it,
 * an error will be thrown and nothing is deleted.
 *
 * All actions are enforced through strict role-based access. This function will
 * never use the native Date type. All IDs are branded as string &
 * tags.Format<'uuid'>.
 *
 * @param props - Properties for the deletion operation
 * @param props.hrRecruiter - The authenticated HR recruiter performing the
 *   operation
 * @param props.applicationId - The UUID of the job application the feedback
 *   belongs to
 * @param props.feedbackId - The UUID of the feedback entry to be deleted
 * @returns Void
 * @throws {Error} When feedback does not exist or when the user is not the
 *   owner
 */
export async function deleteatsRecruitmentHrRecruiterApplicationsApplicationIdFeedbackFeedbackId(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
  feedbackId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { hrRecruiter, applicationId, feedbackId } = props;
  // Ensure the feedback exists, is for the correct application, and is owned by the caller
  const feedback =
    await MyGlobal.prisma.ats_recruitment_application_feedback.findFirst({
      where: {
        id: feedbackId,
        application_id: applicationId,
        reviewer_id: hrRecruiter.id,
      },
      select: { id: true },
    });
  if (!feedback) {
    throw new Error("Feedback not found or not authorized");
  }
  // Perform hard delete (no soft delete available)
  await MyGlobal.prisma.ats_recruitment_application_feedback.delete({
    where: { id: feedbackId },
  });
}
