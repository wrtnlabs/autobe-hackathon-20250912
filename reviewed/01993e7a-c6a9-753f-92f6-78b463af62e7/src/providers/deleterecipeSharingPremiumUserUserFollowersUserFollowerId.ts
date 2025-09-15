import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Delete a user follower relationship by ID.
 *
 * This operation permanently deletes a follower-followee relationship in the
 * recipe sharing platform identified by the given userFollowerId. Authorization
 * requires the authenticated premium user to be either the follower or the
 * followee in that relationship.
 *
 * @param props - Object containing the premiumUser payload and userFollowerId
 *   for the follower relationship to delete.
 * @param props.premiumUser - Authenticated premium user payload.
 * @param props.userFollowerId - UUID of the user follower relationship to
 *   delete.
 * @returns Promise<void> - Resolves when deletion is complete. Throws if not
 *   found or unauthorized.
 * @throws {Error} When the follower relationship is not found.
 * @throws {Error} When the premium user is unauthorized to delete the follower.
 */
export async function deleterecipeSharingPremiumUserUserFollowersUserFollowerId(props: {
  premiumUser: PremiumuserPayload;
  userFollowerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { premiumUser, userFollowerId } = props;

  const follower =
    await MyGlobal.prisma.recipe_sharing_user_followers.findUnique({
      where: { id: userFollowerId },
      select: { id: true, follower_user_id: true, followee_user_id: true },
    });

  if (!follower) {
    throw new Error("Follower relationship not found");
  }

  if (
    follower.follower_user_id !== premiumUser.id &&
    follower.followee_user_id !== premiumUser.id
  ) {
    throw new Error(
      "Unauthorized: You can only delete your own follower relationships",
    );
  }

  await MyGlobal.prisma.recipe_sharing_user_followers.delete({
    where: { id: userFollowerId },
  });
}
