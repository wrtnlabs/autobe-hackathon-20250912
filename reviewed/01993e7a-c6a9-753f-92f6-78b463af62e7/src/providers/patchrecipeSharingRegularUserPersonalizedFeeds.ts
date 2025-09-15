import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import { IPageIRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPersonalizedFeed";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Search personalized feeds with filtering and pagination
 *
 * Retrieve personalized feed entries for a user according to the supplied
 * filtering and pagination criteria. The response contains a paginated list of
 * summarized personalized feed entries including recipe and originator
 * information.
 *
 * Supports filtering by user ID, recipe ID, originator user ID, and sorting by
 * creation time.
 *
 * Authorized access is limited to authenticated regular users.
 *
 * @param props - Object containing authenticated regularUser and request body
 * @param props.regularUser - Authenticated regular user payload
 * @param props.body - Filter and pagination parameters
 * @returns Paginated list of personalized feed entries summary
 * @throws {Error} Throws if query execution fails
 */
export async function patchrecipeSharingRegularUserPersonalizedFeeds(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingPersonalizedFeed.IRequest;
}): Promise<IPageIRecipeSharingPersonalizedFeed.ISummary> {
  const { regularUser, body } = props;

  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const where = {
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.recipe_id !== undefined &&
      body.recipe_id !== null && { recipe_id: body.recipe_id }),
    ...(body.originator_user_id !== undefined &&
      body.originator_user_id !== null && {
        originator_user_id: body.originator_user_id,
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_personalized_feeds.findMany({
      where,
      orderBy: { created_at: body.order === "asc" ? "asc" : "desc" },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_personalized_feeds.count({ where }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    recipe_id: item.recipe_id,
    originator_user_id: item.originator_user_id,
    created_at: toISOStringSafe(item.created_at),
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
