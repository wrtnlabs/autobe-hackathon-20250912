import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";
import { IPageIRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReviewVote";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieves a paginated list of all helpfulness votes related to a specific
 * review.
 *
 * This function fetches review votes filtered by reviewId and optionally by
 * userId. Supports pagination, sorting, and filtering as provided in the
 * request body.
 *
 * @param props - Object containing the authorized regular user, review ID, and
 *   request body.
 * @param props.regularUser - Authenticated regular user making the request.
 * @param props.reviewId - UUID of the review to fetch votes for.
 * @param props.body - Request body specifying pagination, filtering, and
 *   sorting options.
 * @returns A Promise resolving to a paginated list of review votes.
 * @throws {Error} Throws on database errors or unexpected failures.
 */
export async function patchrecipeSharingRegularUserReviewsReviewIdVotes(props: {
  regularUser: RegularuserPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IRecipeSharingReviewVote.IRequest;
}): Promise<IPageIRecipeSharingReviewVote> {
  const { regularUser, reviewId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereConditions = {
    recipe_sharing_review_id: reviewId,
    ...(body.filterByUserId !== undefined &&
      body.filterByUserId !== null && {
        recipe_sharing_user_id: body.filterByUserId,
      }),
  };

  const orderByCondition = body.sortBy
    ? { [body.sortBy]: body.sortOrder === "asc" ? "asc" : "desc" }
    : { created_at: "desc" };

  const [votes, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_review_votes.findMany({
      where: whereConditions,
      orderBy: orderByCondition,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_review_votes.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: votes.map((vote) => ({
      id: vote.id,
      recipe_sharing_user_id: vote.recipe_sharing_user_id,
      recipe_sharing_review_id: vote.recipe_sharing_review_id,
      helpful: vote.helpful,
      created_at: toISOStringSafe(vote.created_at),
      updated_at: toISOStringSafe(vote.updated_at),
    })),
  };
}
