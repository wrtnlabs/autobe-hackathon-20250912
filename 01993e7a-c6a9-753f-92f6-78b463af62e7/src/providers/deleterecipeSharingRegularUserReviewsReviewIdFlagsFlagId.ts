import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Remove a specific flag from a review.
 *
 * Permanently deletes the flag identified by flagId associated with reviewId.
 * Only the original creator of the flag (regularUser) can perform this action.
 *
 * @param props - Object containing regularUser authentication and identifiers.
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion.
 * @param props.reviewId - UUID of the review associated with the flag.
 * @param props.flagId - UUID of the flag to delete.
 * @throws {Error} When the flag is not found.
 * @throws {Error} When the user attempting deletion is not the flag creator.
 */
export async function deleterecipeSharingRegularUserReviewsReviewIdFlagsFlagId(props: {
  regularUser: RegularuserPayload;
  reviewId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, reviewId, flagId } = props;

  const flag = await MyGlobal.prisma.recipe_sharing_review_flags.findFirst({
    where: {
      id: flagId,
      recipe_sharing_review_id: reviewId,
    },
  });

  if (!flag) {
    throw new Error("Flag not found");
  }

  if (flag.recipe_sharing_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You can only delete your own flags");
  }

  await MyGlobal.prisma.recipe_sharing_review_flags.delete({
    where: { id: flagId },
  });
}
