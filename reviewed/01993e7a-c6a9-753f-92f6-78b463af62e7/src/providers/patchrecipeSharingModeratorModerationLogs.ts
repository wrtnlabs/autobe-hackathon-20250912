import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerationLog";
import { IPageIRecipeSharingModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingModerationLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve paginated list of moderation logs for review moderation activities.
 *
 * This endpoint returns moderation event records such as hiding or unhiding
 * reviews, with associated moderator identities, timestamps, and optional
 * comments.
 *
 * Access restricted to authorized moderators.
 *
 * @param props - Object containing the authenticated moderator and
 *   filtering/pagination parameters
 * @param props.moderator - The authenticated moderator performing the query
 * @param props.body - Filtering and pagination parameters for moderation logs
 * @returns Paginated collection of moderation logs matching the criteria
 * @throws {Error} When database operation fails or invalid parameters
 */
export async function patchrecipeSharingModeratorModerationLogs(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingModerationLog.IRequest;
}): Promise<IPageIRecipeSharingModerationLog> {
  const { moderator, body } = props;

  // Default pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Calculate offset for pagination
  const skip = (page - 1) * limit;

  // Build dynamic where clause for optional filters
  const where = {
    ...(body.recipe_sharing_review_id !== undefined &&
      body.recipe_sharing_review_id !== null && {
        recipe_sharing_review_id: body.recipe_sharing_review_id,
      }),
    ...(body.recipe_sharing_moderator_id !== undefined &&
      body.recipe_sharing_moderator_id !== null && {
        recipe_sharing_moderator_id: body.recipe_sharing_moderator_id,
      }),
    ...(body.action !== undefined &&
      body.action !== null && {
        action: body.action,
      }),
  };

  // Concurrently fetch paginated data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_moderation_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_moderation_logs.count({ where }),
  ]);

  // Map database rows to API response format with date conversion
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      recipe_sharing_review_id: row.recipe_sharing_review_id,
      recipe_sharing_moderator_id: row.recipe_sharing_moderator_id,
      action: row.action,
      comment: row.comment ?? null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
