import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update a specific helpfulness vote on a recipe review.
 *
 * This operation updates the helpfulness flag indicating whether the vote marks
 * the review as helpful or not. Only the user who made the vote can update it.
 *
 * @param props - Properties containing user credentials, review ID, vote ID,
 *   and update body
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.reviewId - UUID of the review which the vote belongs to
 * @param props.voteId - UUID of the vote to update
 * @param props.body - The partial update for the review vote
 * @returns The updated review vote entity
 * @throws {Error} When the vote does not exist
 * @throws {Error} When the authenticated user is not authorized to update this
 *   vote
 */
export async function putrecipeSharingRegularUserReviewsReviewIdVotesVoteId(props: {
  regularUser: RegularuserPayload;
  reviewId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRecipeSharingReviewVote.IUpdate;
}): Promise<IRecipeSharingReviewVote> {
  const { regularUser, reviewId, voteId, body } = props;

  // Find the existing vote
  const existingVote =
    await MyGlobal.prisma.recipe_sharing_review_votes.findUnique({
      where: { id: voteId },
    });

  if (!existingVote) {
    throw new Error("Vote not found");
  }

  // Check ownership and review match
  if (
    existingVote.recipe_sharing_user_id !== regularUser.id ||
    existingVote.recipe_sharing_review_id !== reviewId
  ) {
    throw new Error("Unauthorized to update this vote");
  }

  // Build the update data object with only allowed properties
  const updateData: IRecipeSharingReviewVote.IUpdate = {};

  if (body.helpful !== undefined) {
    updateData.helpful = body.helpful;
  }
  if (body.recipe_sharing_user_id !== undefined) {
    updateData.recipe_sharing_user_id = body.recipe_sharing_user_id;
  }
  if (body.recipe_sharing_review_id !== undefined) {
    updateData.recipe_sharing_review_id = body.recipe_sharing_review_id;
  }
  if (body.created_at !== undefined) {
    updateData.created_at = body.created_at;
  }
  if (body.updated_at !== undefined) {
    updateData.updated_at = body.updated_at;
  }

  // Perform update
  const updatedVote = await MyGlobal.prisma.recipe_sharing_review_votes.update({
    where: { id: voteId },
    data: updateData,
  });

  // Return the updated vote with dates converted to ISO string format
  return {
    id: updatedVote.id,
    recipe_sharing_user_id: updatedVote.recipe_sharing_user_id,
    recipe_sharing_review_id: updatedVote.recipe_sharing_review_id,
    helpful: updatedVote.helpful,
    created_at: toISOStringSafe(updatedVote.created_at),
    updated_at: toISOStringSafe(updatedVote.updated_at),
  };
}
