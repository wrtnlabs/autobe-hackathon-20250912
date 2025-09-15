import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import { IPageIRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPersonalizedFeed";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Search personalized feeds with filtering and pagination
 *
 * Retrieves a paginated list of personalized feed entries filtered by user ID,
 * recipe ID, and originator user ID. Supports sorting by creation date and
 * descending/ascending order. Returns summarized entries optimized for frontend
 * display.
 *
 * Authorization required: Only accessible to authenticated premium users.
 *
 * @param props - Object containing premiumUser authentication and request body
 * @param props.premiumUser - The authenticated premium user making the request
 * @param props.body - The request body containing filters, paging and sorting
 *   params
 * @returns Paginated summarized personalized feed entries
 * @throws {Error} Throws if any unexpected database operation error occurs
 */
export async function patchrecipeSharingPremiumUserPersonalizedFeeds(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingPersonalizedFeed.IRequest;
}): Promise<IPageIRecipeSharingPersonalizedFeed.ISummary> {
  const { premiumUser, body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;
  const skip = page * limit;

  const where: {
    user_id?: string & tags.Format<"uuid">;
    recipe_id?: string & tags.Format<"uuid">;
    originator_user_id?: string & tags.Format<"uuid">;
  } = {};

  if (body.user_id !== undefined && body.user_id !== null) {
    where.user_id = body.user_id;
  }
  if (body.recipe_id !== undefined && body.recipe_id !== null) {
    where.recipe_id = body.recipe_id;
  }
  if (
    body.originator_user_id !== undefined &&
    body.originator_user_id !== null
  ) {
    where.originator_user_id = body.originator_user_id;
  }

  const order = body.order === "asc" ? "asc" : "desc";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_personalized_feeds.findMany({
      where,
      orderBy: { created_at: order },
      skip,
      take: limit,
      select: {
        id: true,
        recipe_id: true,
        originator_user_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.recipe_sharing_personalized_feeds.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      recipe_id: item.recipe_id,
      originator_user_id: item.originator_user_id,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
