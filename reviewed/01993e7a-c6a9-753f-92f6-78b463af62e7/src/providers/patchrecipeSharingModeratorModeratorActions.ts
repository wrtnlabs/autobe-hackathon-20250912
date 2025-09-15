import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingFlagQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueue";
import { IPageIRecipeSharingFlagQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingFlagQueue";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Searches and retrieves flag queue entries for moderation purposes.
 *
 * This operation supports filtering, pagination, and sorting on the
 * recipe_sharing_flag_queues table.
 *
 * Only moderators are authorized to access this endpoint.
 *
 * @param props - Object containing the moderator credentials and the request
 *   body
 * @param props.moderator - The authenticated moderator making the request
 * @param props.body - Filter, paging, and sorting criteria for flag queue
 *   entries
 * @returns A paginated list of flag queue entries matching the criteria
 * @throws {Error} Throws error if database operations fail
 */
export async function patchrecipeSharingModeratorModeratorActions(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingFlagQueue.IRequest;
}): Promise<IPageIRecipeSharingFlagQueue> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;

  const where: any = {};
  if (
    body.recipe_sharing_review_id !== undefined &&
    body.recipe_sharing_review_id !== null
  ) {
    where.recipe_sharing_review_id = body.recipe_sharing_review_id;
  }
  if (body.reported_by_user_id !== undefined) {
    where.reported_by_user_id = body.reported_by_user_id;
  }
  if (body.flag_reason !== undefined) {
    where.flag_reason = body.flag_reason;
  }
  if (body.status !== undefined) {
    where.status = body.status;
  }

  if (
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
  ) {
    where.created_at = {};
    if (body.created_at_from !== undefined && body.created_at_from !== null) {
      where.created_at.gte = body.created_at_from;
    }
    if (body.created_at_to !== undefined && body.created_at_to !== null) {
      where.created_at.lte = body.created_at_to;
    }
  }

  if (
    (body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
  ) {
    where.updated_at = {};
    if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
      where.updated_at.gte = body.updated_at_from;
    }
    if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
      where.updated_at.lte = body.updated_at_to;
    }
  }

  if (
    (body.deleted_at_from !== undefined && body.deleted_at_from !== null) ||
    (body.deleted_at_to !== undefined && body.deleted_at_to !== null)
  ) {
    where.deleted_at = {};
    if (body.deleted_at_from !== undefined && body.deleted_at_from !== null) {
      where.deleted_at.gte = body.deleted_at_from;
    }
    if (body.deleted_at_to !== undefined && body.deleted_at_to !== null) {
      where.deleted_at.lte = body.deleted_at_to;
    }
  }

  let orderBy: any = { created_at: "desc" };
  if (body.sort) {
    const [field, direction] = body.sort.split(" ");
    if (field && direction && (direction === "asc" || direction === "desc")) {
      if (
        [
          "created_at",
          "updated_at",
          "deleted_at",
          "flag_reason",
          "status",
          "reported_by_user_id",
        ].includes(field)
      ) {
        orderBy = { [field]: direction };
      }
    }
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_flag_queues.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_flag_queues.count({
      where,
    }),
  ]);

  const data = results.map((r) => ({
    id: r.id,
    recipe_sharing_review_id:
      r.recipe_sharing_review_id === null
        ? undefined
        : r.recipe_sharing_review_id,
    reported_by_user_id: r.reported_by_user_id,
    flag_reason: r.flag_reason,
    status: r.status,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at:
      r.deleted_at === null ? undefined : toISOStringSafe(r.deleted_at),
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
