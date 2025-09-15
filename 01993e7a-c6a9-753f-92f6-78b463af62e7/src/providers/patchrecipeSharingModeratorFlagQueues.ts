import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingFlagQueues } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueues";
import { IPageIRecipeSharingFlagQueues } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingFlagQueues";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Get paginated flagged review queue list for moderation
 *
 * This endpoint allows authenticated moderators to retrieve a paginated list of
 * flagged review queues for review and action.
 *
 * @param props - Object containing moderator authentication and filter
 *   parameters
 * @param props.moderator - The authenticated moderator payload
 * @param props.body - Filter and pagination info for flagged review queues
 * @returns Paginated flagged review queue entries matching filters
 * @throws Error if any database operation fails
 */
export async function patchrecipeSharingModeratorFlagQueues(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingFlagQueues.IRequest;
}): Promise<IPageIRecipeSharingFlagQueues> {
  const { moderator, body } = props;

  // Pagination parameters with defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build dynamic where clause
  const where: any = {
    deleted_at: null,
    ...(body.recipe_sharing_review_id !== undefined &&
      body.recipe_sharing_review_id !== null && {
        recipe_sharing_review_id: body.recipe_sharing_review_id,
      }),
    ...(body.reported_by_user_id !== undefined &&
      body.reported_by_user_id !== null && {
        reported_by_user_id: body.reported_by_user_id,
      }),
    ...(body.flag_reason !== undefined && { flag_reason: body.flag_reason }),
    ...(body.status !== undefined && { status: body.status }),
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && { gte: body.createdFrom }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && { lte: body.createdTo }),
          },
        }
      : {}),
    ...((body.updatedFrom !== undefined && body.updatedFrom !== null) ||
    (body.updatedTo !== undefined && body.updatedTo !== null)
      ? {
          updated_at: {
            ...(body.updatedFrom !== undefined &&
              body.updatedFrom !== null && { gte: body.updatedFrom }),
            ...(body.updatedTo !== undefined &&
              body.updatedTo !== null && { lte: body.updatedTo }),
          },
        }
      : {}),
    ...((body.deletedFrom !== undefined && body.deletedFrom !== null) ||
    (body.deletedTo !== undefined && body.deletedTo !== null)
      ? {
          deleted_at: {
            ...(body.deletedFrom !== undefined &&
              body.deletedFrom !== null && { gte: body.deletedFrom }),
            ...(body.deletedTo !== undefined &&
              body.deletedTo !== null && { lte: body.deletedTo }),
          },
        }
      : {}),
  };

  // Sorting
  const orderBy = body.orderBy ?? "created_at";
  const orderDirection = body.orderDirection ?? "desc";

  // Validate orderDirection values
  const orderDirectionValidated = orderDirection === "asc" ? "asc" : "desc";

  // Query records and count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_flag_queues.findMany({
      where,
      orderBy: { [orderBy]: orderDirectionValidated },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_flag_queues.count({ where }),
  ]);

  // Map to API return type
  const data = results.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    recipe_sharing_review_id:
      item.recipe_sharing_review_id === null
        ? undefined
        : (item.recipe_sharing_review_id as
            | (string & tags.Format<"uuid">)
            | undefined),
    reported_by_user_id: item.reported_by_user_id as string &
      tags.Format<"uuid">,
    flag_reason: item.flag_reason,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
