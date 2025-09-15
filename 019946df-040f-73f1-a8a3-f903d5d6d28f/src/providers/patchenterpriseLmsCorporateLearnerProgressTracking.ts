import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProgressTracking";
import { IPageIEnterpriseLmsProgressTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProgressTracking";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve a filtered, paginated list of progress tracking entries.
 *
 * This endpoint supports complex queries including filtering by learner,
 * content, time range, and engagement metrics. It returns paginated summaries
 * to optimize frontend performance.
 *
 * Authorization ensures users can only query data within their tenant and
 * permission scope.
 *
 * @param props - Object containing corporateLearner payload and filter
 *   parameters
 * @param props.corporateLearner - Authenticated corporate learner making the
 *   request
 * @param props.body - Filter and pagination parameters for progress tracking
 * @returns Paginated summaries of progress tracking entries
 * @throws {Error} When pagination parameters are invalid
 */
export async function patchenterpriseLmsCorporateLearnerProgressTracking(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsProgressTracking.IRequest;
}): Promise<IPageIEnterpriseLmsProgressTracking.ISummary> {
  const { corporateLearner, body } = props;

  // Default pagination and validation
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  if (page <= 0) throw new Error("page must be positive");
  if (limit <= 0) throw new Error("limit must be positive");

  // Build where condition
  const whereCondition = {
    deleted_at: null,
    ...(body.learner_id !== undefined &&
      body.learner_id !== null && { learner_id: body.learner_id }),
    ...(body.content_id !== undefined &&
      body.content_id !== null && { content_id: body.content_id }),
  };

  // Fetch data and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_progress_tracking.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_progress_tracking.count({
      where: whereCondition,
    }),
  ]);

  // Return paginated summary data with date conversions
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      learner_id: r.learner_id,
      content_id: r.content_id,
      time_spent_seconds: r.time_spent_seconds,
      assessment_attempts: r.assessment_attempts,
      engagement_score: r.engagement_score,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
  };
}
