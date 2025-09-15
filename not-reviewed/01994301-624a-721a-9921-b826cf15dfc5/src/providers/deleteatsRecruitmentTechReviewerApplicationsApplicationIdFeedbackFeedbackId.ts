import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Permanently delete a feedback entry for an application
 * (AtsRecruitmentApplicationFeedback table).
 *
 * This endpoint enables an authorized technical reviewer to permanently delete
 * their own feedback record for a given application, enforcing strict ownership
 * checks. The feedback is identified by unique feedbackId and applicationId.
 * Only the original author (reviewer) can perform this operation. The deletion
 * is a hard delete (no soft delete available in feedback schema), removing the
 * record from the system irreversibly. Attempting to delete nonexistent or
 * not-owned feedback results in an error. This mechanism assures integrity and
 * compliance of sensitive evaluation process records, supporting audit
 * requirements externally.
 *
 * @param props - Parameters including techReviewer authorization and
 *   feedback/application IDs.
 * @param props.techReviewer - The authenticated technical reviewer performing
 *   the operation (ownership enforced)
 * @param props.applicationId - UUID of the application the feedback belongs to
 * @param props.feedbackId - UUID of the feedback record to be deleted
 * @returns Void
 * @throws {Error} If the feedback record does not exist for the given IDs
 * @throws {Error} If the requesting user is not the feedback's original author
 */
export async function deleteatsRecruitmentTechReviewerApplicationsApplicationIdFeedbackFeedbackId(props: {
  techReviewer: TechreviewerPayload;
  applicationId: string & tags.Format<"uuid">;
  feedbackId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { techReviewer, applicationId, feedbackId } = props;
  // Fetch only reviewer_id for ownership check (no extra fields)
  const feedback =
    await MyGlobal.prisma.ats_recruitment_application_feedback.findFirst({
      where: {
        id: feedbackId,
        application_id: applicationId,
      },
      select: { reviewer_id: true },
    });
  if (!feedback) {
    throw new Error("Feedback not found");
  }
  if (feedback.reviewer_id !== techReviewer.id) {
    throw new Error(
      "Forbidden: Only the feedback owner can delete this feedback record.",
    );
  }
  // Proceed with hard delete (irrecoverable)
  await MyGlobal.prisma.ats_recruitment_application_feedback.delete({
    where: { id: feedbackId },
  });
}
