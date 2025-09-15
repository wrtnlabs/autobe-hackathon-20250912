import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Create feedback for an application (AtsRecruitmentApplicationFeedback table).
 *
 * This endpoint enables authorized technical reviewers (techReviewer) to create
 * a feedback entry for a specified job application. The feedback includes
 * structured or free-form assessment, an optional numeric rating, and a flag
 * for final recommendation. Uniqueness is enforced per (application, reviewer)
 * by schema—the system will reject duplicate feedback.
 *
 * Authorization is enforced by decorator: only authenticated, active
 * techReviewers may use this endpoint. The application must exist and not be
 * soft-deleted. All values are created immutably and returned as the correct
 * DTO structure. All date/time values are handled as string &
 * tags.Format<'date-time'>, never Date objects.
 *
 * @param props - Request properties
 * @param props.techReviewer - Authenticated techReviewer submitting feedback
 * @param props.applicationId - The UUID of the application being reviewed
 * @param props.body - Feedback details (body, optional rating, final
 *   recommendation flag)
 * @returns The created feedback entry as IAtsRecruitmentApplicationFeedback
 * @throws {Error} If the application does not exist, is deleted, or feedback
 *   already exists for (application, reviewer)
 */
export async function postatsRecruitmentTechReviewerApplicationsApplicationIdFeedback(props: {
  techReviewer: TechreviewerPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationFeedback.ICreate;
}): Promise<IAtsRecruitmentApplicationFeedback> {
  // 1. Verify application exists and is not soft-deleted
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: {
        id: props.applicationId,
        deleted_at: null,
      },
    });
  if (!application) {
    throw new Error("Application not found or has been deleted.");
  }
  // 2. Ensure no duplicate feedback by this reviewer for this application
  const existing =
    await MyGlobal.prisma.ats_recruitment_application_feedback.findFirst({
      where: {
        application_id: props.applicationId,
        reviewer_id: props.techReviewer.id,
      },
    });
  if (existing) {
    throw new Error(
      "Feedback already exists for this application by this reviewer.",
    );
  }
  // 3. Create feedback (all time/uuid values properly branded)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.ats_recruitment_application_feedback.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        application_id: props.applicationId,
        reviewer_id: props.techReviewer.id,
        feedback_body: props.body.feedback_body,
        rating: props.body.rating ?? undefined,
        is_final_recommendation: props.body.is_final_recommendation,
        created_at: now,
      },
    });
  // 4. Return exact DTO structure
  return {
    id: created.id,
    application_id: created.application_id,
    reviewer_id: created.reviewer_id,
    feedback_body: created.feedback_body,
    rating: created.rating ?? undefined,
    is_final_recommendation: created.is_final_recommendation,
    created_at: created.created_at,
  };
}
