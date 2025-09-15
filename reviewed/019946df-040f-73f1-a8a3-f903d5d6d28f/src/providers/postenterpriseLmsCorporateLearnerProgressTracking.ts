import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Create progress tracking entry
 *
 * Creates a new progress tracking record capturing learner interactions with
 * specific content, including time spent, assessment attempts, and engagement
 * score. Ensures authorization that only the authenticated corporate learner
 * can create records tied to their own learner ID.
 *
 * @param props - Object containing corporateLearner authorization payload and
 *   the progress tracking creation data
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.body - Progress tracking creation data complying with
 *   IEnterpriseLmsProgressTracking.ICreate
 * @returns Created full progress tracking record with generated ID and
 *   timestamps
 * @throws {Error} If the corporate learner attempts to create a record for
 *   another learner
 */
export async function postenterpriseLmsCorporateLearnerProgressTracking(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsProgressTracking.ICreate;
}): Promise<IEnterpriseLmsProgressTracking> {
  const { corporateLearner, body } = props;

  if (corporateLearner.id !== body.learner_id) {
    throw new Error(
      "Unauthorized: cannot create progress tracking for other learners",
    );
  }

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.enterprise_lms_progress_tracking.create(
    {
      data: {
        id,
        learner_id: body.learner_id,
        content_id: body.content_id,
        time_spent_seconds: body.time_spent_seconds,
        assessment_attempts: body.assessment_attempts,
        engagement_score: body.engagement_score,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    learner_id: created.learner_id as string & tags.Format<"uuid">,
    content_id: created.content_id as string & tags.Format<"uuid">,
    time_spent_seconds: created.time_spent_seconds as number &
      tags.Type<"int32">,
    assessment_attempts: created.assessment_attempts as number &
      tags.Type<"int32">,
    engagement_score: created.engagement_score,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
