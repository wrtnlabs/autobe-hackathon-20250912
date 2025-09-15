import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Delete a personalized feed entry by its unique identifier.
 *
 * Permanently removes the feed entry from the database. This operation is
 * irreversible and only authorized regular users can perform this action.
 *
 * @param props - Object containing the authenticated regular user and the ID of
 *   the personalized feed entry to delete.
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion.
 * @param props.personalizedFeedId - UUID of the personalized feed entry to
 *   delete.
 * @throws {Error} If the personalized feed entry does not belong to the user.
 * @throws {Error} If the personalized feed entry does not exist.
 */
export async function deleterecipeSharingRegularUserPersonalizedFeedsPersonalizedFeedId(props: {
  regularUser: RegularuserPayload;
  personalizedFeedId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, personalizedFeedId } = props;

  // Find the personalized feed entry or throw if not found
  const feedEntry =
    await MyGlobal.prisma.recipe_sharing_personalized_feeds.findUniqueOrThrow({
      where: { id: personalizedFeedId },
    });

  // Authorization check: user must own the feed entry
  if (feedEntry.user_id !== regularUser.id) {
    throw new Error(
      "Unauthorized: You can only delete your own personalized feed entries",
    );
  }

  // Hard delete from database
  await MyGlobal.prisma.recipe_sharing_personalized_feeds.delete({
    where: { id: personalizedFeedId },
  });
}
