import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Get detailed feedback entry for an application
 * (ats_recruitment_application_feedback).
 *
 * Retrieves the full details of a specific feedback entry for an application
 * from ats_recruitment_application_feedback. Covers reviewer identity/role,
 * feedback body, score, whether final, and timestamp. Essential for in-depth
 * review workflow, audit, or investigating how a candidate was scored or
 * commented on by HR or technical reviewer.
 *
 * Only the feedback's author (tech reviewer) may view the full feedback details
 * in this context. If no feedback is found for the given application and
 * feedback ID, or if the authenticated tech reviewer is not the feedback's
 * author, a standard Error is thrown.
 *
 * @param props - Operation input
 * @param props.techReviewer - The authenticated tech reviewer making this
 *   request
 * @param props.applicationId - The id of the application to which the feedback
 *   belongs
 * @param props.feedbackId - The id of the feedback record
 * @returns A full feedback DTO with all required details
 * @throws {Error} When no feedback is found, or if the authenticated reviewer
 *   is not the feedback author
 */
export async function getatsRecruitmentTechReviewerApplicationsApplicationIdFeedbackFeedbackId(props: {
  techReviewer: TechreviewerPayload;
  applicationId: string & tags.Format<"uuid">;
  feedbackId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicationFeedback> {
  const { techReviewer, applicationId, feedbackId } = props;

  // Fetch feedback strictly matching both feedbackId and applicationId
  const feedback =
    await MyGlobal.prisma.ats_recruitment_application_feedback.findFirst({
      where: {
        id: feedbackId,
        application_id: applicationId,
      },
    });
  if (!feedback) {
    throw new Error("Feedback not found for this application");
  }
  // Only the feedback author's own entry is visible to this role
  if (feedback.reviewer_id !== techReviewer.id) {
    throw new Error(
      "Forbidden: only the author may access this feedback entry",
    );
  }
  // Return full DTO, as per type requirements (no assertions, explicit conversions)
  return {
    id: feedback.id,
    application_id: feedback.application_id,
    reviewer_id: feedback.reviewer_id,
    feedback_body: feedback.feedback_body,
    rating:
      feedback.rating === null || feedback.rating === undefined
        ? undefined
        : feedback.rating,
    is_final_recommendation: feedback.is_final_recommendation,
    created_at: toISOStringSafe(feedback.created_at),
  };
}
