import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a helpfulness vote for a review
 *
 * Allows a regular user to cast or update a helpfulness vote on a review
 * specified by reviewId. One vote per user per review is enforced: existing
 * votes are updated, new votes are created.
 *
 * @param props - Contains the authenticated regular user, review ID, and vote
 *   creation data
 * @param props.regularUser - Authenticated regular user payload
 * @param props.reviewId - UUID of the review to vote on
 * @param props.body - Vote creation data including helpfulness status
 * @returns The created or updated helpfulness vote record
 * @throws {Error} When the specified review does not exist
 */
export async function postrecipeSharingRegularUserReviewsReviewIdVotes(props: {
  regularUser: RegularuserPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IRecipeSharingReviewVote.ICreate;
}): Promise<IRecipeSharingReviewVote> {
  const { regularUser, reviewId, body } = props;

  // Verify that the review exists
  const review = await MyGlobal.prisma.recipe_sharing_reviews.findUnique({
    where: { id: reviewId },
  });
  if (!review) throw new Error("Review not found");

  // Check for existing vote by this user on this review
  const existingVote =
    await MyGlobal.prisma.recipe_sharing_review_votes.findFirst({
      where: {
        recipe_sharing_user_id: regularUser.id,
        recipe_sharing_review_id: reviewId,
      },
    });

  if (existingVote) {
    // Update existing vote
    const updated = await MyGlobal.prisma.recipe_sharing_review_votes.update({
      where: { id: existingVote.id },
      data: {
        helpful: body.helpful,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    return {
      id: updated.id,
      recipe_sharing_user_id: updated.recipe_sharing_user_id,
      recipe_sharing_review_id: updated.recipe_sharing_review_id,
      helpful: updated.helpful,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  }

  // Create a new vote
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.recipe_sharing_review_votes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      recipe_sharing_user_id: regularUser.id,
      recipe_sharing_review_id: reviewId,
      helpful: body.helpful,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    recipe_sharing_user_id: created.recipe_sharing_user_id,
    recipe_sharing_review_id: created.recipe_sharing_review_id,
    helpful: created.helpful,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
