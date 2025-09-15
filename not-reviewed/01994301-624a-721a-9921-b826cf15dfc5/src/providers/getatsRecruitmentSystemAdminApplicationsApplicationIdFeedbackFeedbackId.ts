import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed feedback entry for an application
 * (ats_recruitment_application_feedback).
 *
 * Retrieves the full details of a specific feedback entry for a given
 * application. This covers the reviewer identity, feedback body, numeric
 * rating, whether this was the final recommendation, and its timestamp. Only
 * authorized system administrators may view all content for compliance, quality
 * review, or investigation.
 *
 * Throws an error if the feedback is not found or not related to the specified
 * application.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.applicationId - The unique identifier for the job application
 * @param props.feedbackId - The unique identifier for the feedback to be
 *   fetched
 * @returns Full feedback record as IAtsRecruitmentApplicationFeedback
 * @throws {Error} If feedback not found, or not associated with the application
 */
export async function getatsRecruitmentSystemAdminApplicationsApplicationIdFeedbackFeedbackId(props: {
  systemAdmin: SystemadminPayload;
  applicationId: string & tags.Format<"uuid">;
  feedbackId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicationFeedback> {
  const { applicationId, feedbackId } = props;

  const feedback =
    await MyGlobal.prisma.ats_recruitment_application_feedback.findFirst({
      where: {
        id: feedbackId,
        application_id: applicationId,
      },
    });
  if (!feedback) {
    throw new Error("Feedback not found for this application and feedback ID");
  }

  return {
    id: feedback.id,
    application_id: feedback.application_id,
    reviewer_id: feedback.reviewer_id,
    feedback_body: feedback.feedback_body,
    rating: feedback.rating ?? undefined,
    is_final_recommendation: feedback.is_final_recommendation,
    created_at: toISOStringSafe(feedback.created_at),
  };
}
