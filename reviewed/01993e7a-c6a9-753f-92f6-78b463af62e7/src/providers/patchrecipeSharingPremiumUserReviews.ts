import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import { IPageIRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReview";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Search and retrieve a filtered, paginated list of recipe sharing reviews.
 *
 * Supports filtering by user ID, recipe ID, and text search. Pagination
 * parameters page and limit are honored, with defaults.
 *
 * Returns summary data optimized for list display.
 *
 * @param props - Object containing premiumUser payload and IRequest body for
 *   filtering
 * @param props.premiumUser - Authenticated premium user payload
 * @param props.body - Filtering criteria and pagination for recipe reviews
 * @returns Paginated summary of recipe sharing reviews
 * @throws {Error} Throws if database access fails or parameters are invalid
 */
export async function patchrecipeSharingPremiumUserReviews(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingReview.IRequest;
}): Promise<IPageIRecipeSharingReview.ISummary> {
  const { premiumUser, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where clause filtering out soft deleted
  const where = {
    deleted_at: null,
    ...(body.recipe_sharing_user_id !== undefined &&
      body.recipe_sharing_user_id !== null && {
        recipe_sharing_user_id: body.recipe_sharing_user_id,
      }),
    ...(body.recipe_sharing_recipe_id !== undefined &&
      body.recipe_sharing_recipe_id !== null && {
        recipe_sharing_recipe_id: body.recipe_sharing_recipe_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        review_text: { contains: body.search },
      }),
    // Status filter skipped: not present in Prisma schema.
  };

  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_reviews.findMany({
      where,
      select: {
        id: true,
        review_text: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_reviews.count({ where }),
  ]);

  const data = reviews.map((r) => ({
    id: r.id,
    review_text: r.review_text,
    created_at: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
