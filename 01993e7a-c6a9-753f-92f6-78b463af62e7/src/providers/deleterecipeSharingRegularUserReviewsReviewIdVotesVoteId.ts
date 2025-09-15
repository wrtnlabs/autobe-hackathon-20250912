import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Delete a helpfulness vote on a recipe review, identified by voteId and
 * reviewId.
 *
 * This operation permanently removes the vote record from the database,
 * disallowing recovery. Only the owner of the vote, an authenticated regular
 * user, may perform this deletion.
 *
 * @param props - Object containing the authenticated regular user, reviewId,
 *   and voteId
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion
 * @param props.reviewId - UUID of the target review
 * @param props.voteId - UUID of the vote to delete
 * @throws {Error} When the vote does not exist
 * @throws {Error} When the vote does not belong to the specified review
 * @throws {Error} When the authenticated user is not the vote owner
 */
export async function deleterecipeSharingRegularUserReviewsReviewIdVotesVoteId(props: {
  regularUser: RegularuserPayload;
  reviewId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, reviewId, voteId } = props;

  // Fetch the vote by voteId
  const vote =
    await MyGlobal.prisma.recipe_sharing_review_votes.findUniqueOrThrow({
      where: { id: voteId },
    });

  // Authorize: Check ownership and review association
  if (vote.recipe_sharing_user_id !== regularUser.id) {
    throw new Error("Unauthorized: Only the vote owner can delete the vote");
  }
  if (vote.recipe_sharing_review_id !== reviewId) {
    throw new Error(
      "Invalid operation: Vote does not belong to the specified review",
    );
  }

  // Proceed to delete the vote permanently
  await MyGlobal.prisma.recipe_sharing_review_votes.delete({
    where: { id: voteId },
  });
}
