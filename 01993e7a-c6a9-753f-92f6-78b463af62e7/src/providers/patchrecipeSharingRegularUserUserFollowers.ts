import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";
import { IPageIRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingUserFollower";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve a filtered and paginated list of user follower connections.
 *
 * This endpoint supports complex filtering by follower and followee user IDs,
 * soft deletion status, and pagination controls. It returns a summary list of
 * user follower relationships for the authenticated regular user.
 *
 * @param props - Object containing the authenticated regular user and request
 *   body
 * @param props.regularUser - Authenticated regular user payload
 * @param props.body - Request body containing filter and pagination parameters
 * @returns Paginated summary of user follower relationships
 * @throws {Error} Throws if database operations fail
 */
export async function patchrecipeSharingRegularUserUserFollowers(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingUserFollower.IRequest;
}): Promise<IPageIRecipeSharingUserFollower.ISummary> {
  const { regularUser, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(body.follower_user_id !== undefined &&
      body.follower_user_id !== null && {
        follower_user_id: body.follower_user_id,
      }),
    ...(body.followee_user_id !== undefined &&
      body.followee_user_id !== null && {
        followee_user_id: body.followee_user_id,
      }),
    ...(body.deleted_at !== undefined &&
      body.deleted_at !== null && {
        deleted_at: body.deleted_at,
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_user_followers.findMany({
      where,
      select: {
        id: true,
        follower_user_id: true,
        followee_user_id: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.recipe_sharing_user_followers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      follower_user_id: item.follower_user_id,
      followee_user_id: item.followee_user_id,
    })),
  };
}
