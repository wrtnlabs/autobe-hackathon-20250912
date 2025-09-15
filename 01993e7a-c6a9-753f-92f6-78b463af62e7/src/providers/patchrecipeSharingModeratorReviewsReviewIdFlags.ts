import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";
import { IPageIRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReviewFlag";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * List flags on a review
 *
 * Retrieve a paginated list of flags made on a specific recipe review.
 *
 * This operation supports filtering, sorting, and pagination based on the
 * request body parameters.
 *
 * It interacts with the recipe_sharing_review_flags table linked to the
 * specified reviewId.
 *
 * Only users with moderator roles can access and use this endpoint to review
 * flagged content.
 *
 * @param props - The input parameters including moderator authentication,
 *   reviewId, and request body for filtering and pagination.
 * @returns Paginated list of review flags matching the search criteria.
 * @throws {Error} Throws if any database or permission errors occur.
 */
export async function patchrecipeSharingModeratorReviewsReviewIdFlags(props: {
  moderator: ModeratorPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IRecipeSharingReviewFlag.IRequest;
}): Promise<IPageIRecipeSharingReviewFlag> {
  const { moderator, reviewId, body } = props;

  // Determine pagination
  const page = (body.page ?? 1) as number & tags.Type<"int32"> as number;
  const limit = (body.limit ?? 10) as number & tags.Type<"int32"> as number;
  const skip = (page - 1) * limit;

  // Compose where clause
  const where = {
    recipe_sharing_review_id: reviewId,
    ...(body.search !== undefined &&
      body.search !== null && {
        reason: { contains: body.search },
      }),
  };

  // Compose orderBy
  const orderBy = {
    created_at: body.order === "asc" ? "asc" : "desc",
  };

  // Query from database
  const [flags, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_review_flags.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_review_flags.count({
      where,
    }),
  ]);

  // Map flags
  const data = flags.map((flag) => ({
    id: flag.id,
    recipe_sharing_user_id: flag.recipe_sharing_user_id,
    recipe_sharing_review_id: flag.recipe_sharing_review_id,
    reason: flag.reason,
    created_at: toISOStringSafe(flag.created_at),
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
