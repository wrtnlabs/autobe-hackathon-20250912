import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create feedback for an application (AtsRecruitmentApplicationFeedback table).
 *
 * This endpoint enables authorized HR recruiters to add structured or free-form
 * feedback for a specified job application. Each feedback entry records the
 * reviewer's identity, their assessment or comments on the candidate, a numeric
 * rating (if provided), and whether it represents a final recommendation. Only
 * one feedback per (reviewer, application) is permitted, enforced by a unique
 * constraint. On success, returns the newly created feedback entity with audit
 * timestamp meta. Application and reviewer foreign key references are
 * validated.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter creating feedback
 * @param props.applicationId - UUID of the target application
 * @param props.body - The feedback details (feedback_body, rating?,
 *   is_final_recommendation)
 * @returns The created feedback entity with linked application and reviewer
 *   information
 * @throws {Error} If application does not exist or a feedback by this reviewer
 *   already exists for this application, or referential integrity fails
 */
export async function postatsRecruitmentHrRecruiterApplicationsApplicationIdFeedback(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationFeedback.ICreate;
}): Promise<IAtsRecruitmentApplicationFeedback> {
  // Validate that the application exists
  await MyGlobal.prisma.ats_recruitment_applications.findUniqueOrThrow({
    where: { id: props.applicationId, deleted_at: null },
  });

  const now = toISOStringSafe(new Date());
  const feedback =
    await MyGlobal.prisma.ats_recruitment_application_feedback.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        application_id: props.applicationId,
        reviewer_id: props.hrRecruiter.id,
        feedback_body: props.body.feedback_body,
        rating: props.body.rating ?? undefined,
        is_final_recommendation: props.body.is_final_recommendation,
        created_at: now,
      },
    });
  return {
    id: feedback.id,
    application_id: feedback.application_id,
    reviewer_id: feedback.reviewer_id,
    feedback_body: feedback.feedback_body,
    rating: feedback.rating ?? undefined,
    is_final_recommendation: feedback.is_final_recommendation,
    created_at: now,
  };
}
