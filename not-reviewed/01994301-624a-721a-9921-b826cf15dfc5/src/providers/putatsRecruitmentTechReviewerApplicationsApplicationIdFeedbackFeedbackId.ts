import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Update existing feedback for an application
 * (AtsRecruitmentApplicationFeedback table).
 *
 * This endpoint allows a technical reviewer to update their own feedback for a
 * specific job application. Only the feedback's author (matching the
 * authenticated reviewer) can perform this update. Changes are allowed only to
 * feedback_body, rating, and is_final_recommendation fields. The system
 * enforces strict ownership, and will reject changes by other reviewers. The
 * update is immediately persisted and all immutable fields are protected.
 *
 * @param props - The update request properties
 * @param props.techReviewer - The authenticated tech reviewer requesting the
 *   update
 * @param props.applicationId - The application UUID
 * @param props.feedbackId - The feedback entry UUID
 * @param props.body - Fields to update (only feedback_body, rating,
 *   is_final_recommendation allowed)
 * @returns The updated feedback record matching the current database state
 * @throws {Error} If the feedback does not exist, the IDs do not match, or
 *   reviewer is not the author
 * @throws {Error} If request body has no updatable fields
 */
export async function putatsRecruitmentTechReviewerApplicationsApplicationIdFeedbackFeedbackId(props: {
  techReviewer: TechreviewerPayload;
  applicationId: string & tags.Format<"uuid">;
  feedbackId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationFeedback.IUpdate;
}): Promise<IAtsRecruitmentApplicationFeedback> {
  const { techReviewer, applicationId, feedbackId, body } = props;

  // 1. Fetch record by id
  const feedback =
    await MyGlobal.prisma.ats_recruitment_application_feedback.findUnique({
      where: { id: feedbackId },
    });
  if (!feedback || feedback.application_id !== applicationId) {
    throw new Error("Feedback not found for this application");
  }
  // 2. Enforce reviewer ownership
  if (feedback.reviewer_id !== techReviewer.id) {
    throw new Error("Forbidden: Only the original feedback author may update");
  }
  // 3. Only update explicitly provided fields
  const hasFeedbackBody = Object.prototype.hasOwnProperty.call(
    body,
    "feedback_body",
  );
  const hasRating = Object.prototype.hasOwnProperty.call(body, "rating");
  const hasFinal = Object.prototype.hasOwnProperty.call(
    body,
    "is_final_recommendation",
  );
  // At least one updatable field must be present
  if (!hasFeedbackBody && !hasRating && !hasFinal) {
    throw new Error("No updatable fields provided in feedback update");
  }
  // Construct the patch payload using property inclusion rules
  const updates: Record<string, unknown> = {};
  if (hasFeedbackBody) updates.feedback_body = body.feedback_body;
  if (hasRating) updates.rating = body.rating;
  if (hasFinal) updates.is_final_recommendation = body.is_final_recommendation;
  // 4. Perform the update (no Date types used)
  const updated =
    await MyGlobal.prisma.ats_recruitment_application_feedback.update({
      where: { id: feedbackId },
      data: updates,
    });
  // 5. Map fields to IAtsRecruitmentApplicationFeedback for output
  return {
    id: updated.id,
    application_id: updated.application_id,
    reviewer_id: updated.reviewer_id,
    feedback_body: updated.feedback_body,
    // rating is nullable/optional in DTO; keep undefined if not set, null if set to null
    ...(updated.rating !== undefined ? { rating: updated.rating } : {}),
    is_final_recommendation: updated.is_final_recommendation,
    created_at: toISOStringSafe(updated.created_at),
  };
}
