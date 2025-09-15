import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Update an existing learner's progress tracking record by its unique ID.
 *
 * This operation modifies key learning metrics including time spent on content,
 * number of assessment attempts, and engagement score, reflecting the learner's
 * evolving progress.
 *
 * Only the authenticated corporate learner who owns this record can update it.
 *
 * @param props - Object containing corporateLearner authentication payload,
 *   progress tracking record id, and update data
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.id - Unique identifier of the progress tracking record to update
 * @param props.body - Update data for progress tracking metrics
 * @returns Updated progress tracking record with all relevant fields
 * @throws {Error} If the record is not found or the user is not authorized
 */
export async function putenterpriseLmsCorporateLearnerProgressTrackingId(props: {
  corporateLearner: CorporatelearnerPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProgressTracking.IUpdate;
}): Promise<IEnterpriseLmsProgressTracking> {
  const { corporateLearner, id, body } = props;

  // Fetch the existing progress tracking record or fail
  const tracking =
    await MyGlobal.prisma.enterprise_lms_progress_tracking.findUniqueOrThrow({
      where: { id },
    });

  // Authorization check to ensure ownership
  if (tracking.learner_id !== corporateLearner.id) {
    throw new Error(
      "Unauthorized: You do not own this progress tracking record",
    );
  }

  // Prepare updated_at timestamp
  const updatedAt = toISOStringSafe(new Date());

  // Update the progress tracking record
  const updated = await MyGlobal.prisma.enterprise_lms_progress_tracking.update(
    {
      where: { id },
      data: {
        time_spent_seconds: body.time_spent_seconds,
        assessment_attempts: body.assessment_attempts,
        engagement_score: body.engagement_score,
        updated_at: updatedAt,
      },
    },
  );

  // Return the updated record with correct date formatting and optional deleted_at
  return {
    id: updated.id,
    learner_id: updated.learner_id,
    content_id: updated.content_id,
    time_spent_seconds: updated.time_spent_seconds,
    assessment_attempts: updated.assessment_attempts,
    engagement_score: updated.engagement_score,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updatedAt,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
