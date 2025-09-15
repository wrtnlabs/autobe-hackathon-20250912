import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import { IPageIRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRating";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve a paginated list of recipe ratings matching the search criteria.
 *
 * Allows authenticated regular users to query recipe ratings for analytics or
 * viewing. Supports filtering by user ID, recipe ID, pagination, and sorting.
 *
 * @param props - Object containing the authenticated user and filter parameters
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.body - Filter, pagination, and sorting parameters for rating
 *   query
 * @returns Paginated list of recipe ratings matching the filter criteria
 * @throws {Error} When invalid sortBy field is provided
 */
export async function patchrecipeSharingRegularUserRatings(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRating.IRequest;
}): Promise<IPageIRecipeSharingRating> {
  const { regularUser, body } = props;

  // Pagination setup with defaults and safe brand-stripping
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  // Build the filtering where clause
  const where: {
    recipe_sharing_user_id?: string & tags.Format<"uuid">;
    recipe_sharing_recipe_id?: string & tags.Format<"uuid">;
  } = {};
  if (body.userId !== undefined && body.userId !== null) {
    where.recipe_sharing_user_id = body.userId;
  }
  if (body.recipeId !== undefined && body.recipeId !== null) {
    where.recipe_sharing_recipe_id = body.recipeId;
  }

  // Sorting configuration
  const allowedSortFields = [
    "id",
    "rating",
    "created_at",
    "updated_at",
  ] as const;

  const sortBy =
    body.sortBy &&
    allowedSortFields.includes(
      body.sortBy as (typeof allowedSortFields)[number],
    )
      ? (body.sortBy as (typeof allowedSortFields)[number])
      : "created_at";

  // Prisma expects the order direction
  const orderBy: { [key: string]: "asc" | "desc" } = {
    [sortBy]: "desc",
  };

  // Fetch data and total count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_ratings.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_ratings.count({ where }),
  ]);

  // Map Db results to API output with date string conversion
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map(
      (r): IRecipeSharingRating => ({
        id: r.id,
        recipe_sharing_user_id: r.recipe_sharing_user_id,
        recipe_sharing_recipe_id: r.recipe_sharing_recipe_id,
        rating: r.rating,
        created_at: toISOStringSafe(r.created_at),
        updated_at: toISOStringSafe(r.updated_at),
      }),
    ),
  };
}
