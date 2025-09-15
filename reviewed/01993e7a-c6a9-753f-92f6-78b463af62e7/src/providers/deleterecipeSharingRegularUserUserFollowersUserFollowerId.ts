import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Delete a user follower relationship by ID
 *
 * Permanently removes a follower-followee relationship identified by the given
 * userFollowerId from the database.
 *
 * Authorization is enforced: only the follower or followee user themselves can
 * delete the follower relationship.
 *
 * @param props - Contains the authenticated regular user payload and the
 *   userFollowerId identifying the follower record to delete.
 * @throws {Error} If the follower relationship does not exist.
 * @throws {Error} If the authenticated user is not authorized to delete this
 *   follower relationship.
 */
export async function deleterecipeSharingRegularUserUserFollowersUserFollowerId(props: {
  regularUser: RegularuserPayload;
  userFollowerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const found = await MyGlobal.prisma.recipe_sharing_user_followers.findUnique({
    where: { id: props.userFollowerId },
  });

  if (!found) throw new Error(`User follower relationship not found`);

  if (
    found.follower_user_id !== props.regularUser.id &&
    found.followee_user_id !== props.regularUser.id
  ) {
    throw new Error(`Unauthorized to delete this follower relationship`);
  }

  await MyGlobal.prisma.recipe_sharing_user_followers.delete({
    where: { id: props.userFollowerId },
  });
}
