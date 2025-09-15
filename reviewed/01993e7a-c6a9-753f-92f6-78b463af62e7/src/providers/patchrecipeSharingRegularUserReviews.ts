import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import { IPageIRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReview";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Searches and retrieves a filtered, paginated list of recipe sharing reviews.
 *
 * Supports filtering by user ID, recipe ID, and review text search. Only
 * includes reviews that are not soft deleted. Implements pagination with page
 * and limit.
 *
 * @param props - Object containing the authenticated regular user and search
 *   filters.
 * @param props.regularUser - Authenticated regular user info
 * @param props.body - Search criteria including filters and pagination
 * @returns Paginated summary list of recipe reviews that match the filters
 * @throws {Error} If any error occurs during database access
 */
export async function patchrecipeSharingRegularUserReviews(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingReview.IRequest;
}): Promise<IPageIRecipeSharingReview.ISummary> {
  const { regularUser, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    recipe_sharing_user_id?: string | null;
    recipe_sharing_recipe_id?: string | null;
    review_text?: {
      contains: string;
    };
  } = {
    deleted_at: null,
  };

  if (
    body.recipe_sharing_user_id !== undefined &&
    body.recipe_sharing_user_id !== null
  ) {
    where.recipe_sharing_user_id = body.recipe_sharing_user_id;
  }

  if (
    body.recipe_sharing_recipe_id !== undefined &&
    body.recipe_sharing_recipe_id !== null
  ) {
    where.recipe_sharing_recipe_id = body.recipe_sharing_recipe_id;
  }

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.review_text = { contains: body.search };
  }

  const [results, total] = await Promise.all([
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

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      review_text: r.review_text,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
