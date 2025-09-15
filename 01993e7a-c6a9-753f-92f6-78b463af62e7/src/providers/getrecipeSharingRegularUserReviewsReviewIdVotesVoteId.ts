import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Get details of a specific helpfulness vote on a review.
 *
 * Retrieves detailed information about a helpfulness vote identified by voteId
 * within a specific review identified by reviewId.
 *
 * Requires authenticated regular user.
 *
 * @param props - Object containing regularUser payload, reviewId, and voteId.
 * @returns Detailed information about the helpfulness vote.
 * @throws Error if the specified vote is not found.
 */
export async function getrecipeSharingRegularUserReviewsReviewIdVotesVoteId(props: {
  regularUser: RegularuserPayload;
  reviewId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingReviewVote> {
  const { regularUser, reviewId, voteId } = props;

  // Fetch vote entity matching voteId and reviewId
  const vote =
    await MyGlobal.prisma.recipe_sharing_review_votes.findFirstOrThrow({
      where: {
        id: voteId,
        recipe_sharing_review_id: reviewId,
      },
    });

  // Map dates explicitly and assign correct branded types
  const id: string & tags.Format<"uuid"> = vote.id;
  const recipe_sharing_user_id: string & tags.Format<"uuid"> =
    vote.recipe_sharing_user_id;
  const recipe_sharing_review_id: string & tags.Format<"uuid"> =
    vote.recipe_sharing_review_id;
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    vote.created_at,
  );
  const updated_at: string & tags.Format<"date-time"> = toISOStringSafe(
    vote.updated_at,
  );

  return {
    id,
    recipe_sharing_user_id,
    recipe_sharing_review_id,
    helpful: vote.helpful,
    created_at,
    updated_at,
  };
}
