import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Get progress tracking record by ID
 *
 * Retrieve detailed information about a learner's progress tracking by its
 * unique ID. This endpoint returns metrics including time spent (seconds),
 * assessment attempts, and engagement score related to the learner's
 * interaction with specific content.
 *
 * Access control ensures only authorized corporate learners can retrieve the
 * data.
 *
 * @param props - Object containing the corporate learner payload and the
 *   progress tracking record ID
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.id - Unique identifier of the progress tracking record
 * @returns Detailed progress tracking information matching
 *   IEnterpriseLmsProgressTracking
 * @throws {Error} When no progress tracking record is found
 * @throws {Error} When the requester is not authorized to access the record
 */
export async function getenterpriseLmsCorporateLearnerProgressTrackingId(props: {
  corporateLearner: CorporatelearnerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsProgressTracking> {
  const { corporateLearner, id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_progress_tracking.findUnique({
      where: { id },
    });

  if (!record) {
    throw new Error("Progress tracking record not found");
  }

  if (record.learner_id !== corporateLearner.id) {
    throw new Error("Unauthorized access");
  }

  return {
    id: record.id,
    learner_id: record.learner_id,
    content_id: record.content_id,
    time_spent_seconds: record.time_spent_seconds,
    assessment_attempts: record.assessment_attempts,
    engagement_score: record.engagement_score,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
