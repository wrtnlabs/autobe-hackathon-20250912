import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update existing feedback for an application
 * (AtsRecruitmentApplicationFeedback table).
 *
 * This operation allows an HR recruiter or technical reviewer to update their
 * own feedback entry for a specific application. Only the reviewer who authored
 * the feedback (matching hrRecruiter.id) may update the entry. Only
 * feedback_body, rating (number/null/undefined), and is_final_recommendation
 * (boolean/undefined) can be updated. Partial updates are supported.
 *
 * Proper error handling is enforced: returns error if feedback is not found or
 * is not owned by issuer. No `Date` types are exposed; date/datetime outputs
 * are converted with toISOStringSafe.
 *
 * @param props - The update request properties
 * @param props.hrRecruiter - Authenticated HR recruiter (authorization
 *   required)
 * @param props.applicationId - UUID of the target application
 * @param props.feedbackId - UUID of the feedback entry to update
 * @param props.body - Fields to update: feedback_body, rating,
 *   is_final_recommendation
 * @returns The fully updated feedback entity, all fields populated as per
 *   IAtsRecruitmentApplicationFeedback
 * @throws {Error} If the feedback does not exist or the requester is not the
 *   owner (reviewer)
 */
export async function putatsRecruitmentHrRecruiterApplicationsApplicationIdFeedbackFeedbackId(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
  feedbackId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationFeedback.IUpdate;
}): Promise<IAtsRecruitmentApplicationFeedback> {
  const { hrRecruiter, applicationId, feedbackId, body } = props;

  // Fetch feedback
  const feedback =
    await MyGlobal.prisma.ats_recruitment_application_feedback.findFirst({
      where: {
        id: feedbackId,
        application_id: applicationId,
      },
    });
  if (!feedback) throw new Error("Feedback not found");
  if (feedback.reviewer_id !== hrRecruiter.id)
    throw new Error("Not feedback owner");

  // Validate feedback_body (must be non-empty if provided)
  if (body.feedback_body !== undefined && body.feedback_body.trim() === "") {
    throw new Error("Feedback body cannot be empty");
  }

  // Only update fields actually present
  const updateData = {
    ...(body.feedback_body !== undefined
      ? { feedback_body: body.feedback_body }
      : {}),
    ...(body.rating !== undefined ? { rating: body.rating } : {}),
    ...(body.is_final_recommendation !== undefined
      ? { is_final_recommendation: body.is_final_recommendation }
      : {}),
  } satisfies Partial<{
    feedback_body: string;
    rating: number | null;
    is_final_recommendation: boolean;
  }>;

  const updated =
    await MyGlobal.prisma.ats_recruitment_application_feedback.update({
      where: { id: feedbackId },
      data: updateData,
    });

  return {
    id: updated.id,
    application_id: updated.application_id,
    reviewer_id: updated.reviewer_id,
    feedback_body: updated.feedback_body,
    rating: updated.rating ?? undefined,
    is_final_recommendation: updated.is_final_recommendation,
    created_at: toISOStringSafe(updated.created_at),
  };
}
