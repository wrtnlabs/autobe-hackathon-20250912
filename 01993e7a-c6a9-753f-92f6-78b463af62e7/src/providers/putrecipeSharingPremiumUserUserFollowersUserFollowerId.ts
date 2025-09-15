import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Update a user follower relationship by ID.
 *
 * Updates the user follower record identified by 'userFollowerId' parameter.
 * Allows changing follower and followee user IDs and soft delete timestamp.
 * Validates that both new follower and followee users exist in the regular
 * users table. Only authenticated premium users can perform this update.
 *
 * @param props - Properties including premiumUser auth, userFollowerId path
 *   param and update body
 * @returns The updated IRecipeSharingUserFollower record
 * @throws {Error} When the follower or followee user does not exist
 * @throws {Error} When the user follower record does not exist
 */
export async function putrecipeSharingPremiumUserUserFollowersUserFollowerId(props: {
  premiumUser: PremiumuserPayload;
  userFollowerId: string & tags.Format<"uuid">;
  body: IRecipeSharingUserFollower.IUpdate;
}): Promise<IRecipeSharingUserFollower> {
  const { premiumUser, userFollowerId, body } = props;

  // Retrieve the existing user follower record or throw if not found
  const existing =
    await MyGlobal.prisma.recipe_sharing_user_followers.findUniqueOrThrow({
      where: { id: userFollowerId },
    });

  // Validate existence of follower_user_id if provided
  if (body.follower_user_id !== undefined) {
    const followerUser =
      await MyGlobal.prisma.recipe_sharing_regularusers.findUnique({
        where: { id: body.follower_user_id },
        select: { id: true },
      });
    if (!followerUser) throw new Error("Follower user not found");
  }

  // Validate existence of followee_user_id if provided
  if (body.followee_user_id !== undefined) {
    const followeeUser =
      await MyGlobal.prisma.recipe_sharing_regularusers.findUnique({
        where: { id: body.followee_user_id },
        select: { id: true },
      });
    if (!followeeUser) throw new Error("Followee user not found");
  }

  // Capture current timestamp
  const now = toISOStringSafe(new Date());

  // Perform the update
  const updated = await MyGlobal.prisma.recipe_sharing_user_followers.update({
    where: { id: userFollowerId },
    data: {
      follower_user_id: body.follower_user_id ?? undefined,
      followee_user_id: body.followee_user_id ?? undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      updated_at: now,
    },
  });

  // Return updated record with all date fields converted properly
  return {
    id: updated.id,
    follower_user_id: updated.follower_user_id,
    followee_user_id: updated.followee_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
