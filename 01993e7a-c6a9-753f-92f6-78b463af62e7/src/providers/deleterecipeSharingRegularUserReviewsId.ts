import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Permanently deletes a recipe review by its unique ID.
 *
 * This operation enforces authorization, allowing only the original review
 * author (regular user) to delete the review. It performs a hard delete as the
 * underlying model does not support soft deletes.
 *
 * @param props - Object containing the authenticated regular user and review
 *   ID.
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion.
 * @param props.id - Unique identifier of the review to be deleted.
 * @throws {Error} Throws if the review does not exist or the user is
 *   unauthorized.
 */
export async function deleterecipeSharingRegularUserReviewsId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, id } = props;

  // Retrieve the review by its ID, throws if not found
  const review = await MyGlobal.prisma.recipe_sharing_reviews.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Authorization: Only authors can delete their reviews
  if (review.recipe_sharing_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You can only delete your own reviews.");
  }

  // Perform hard delete
  await MyGlobal.prisma.recipe_sharing_reviews.delete({
    where: { id },
  });
}
