import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update a user follower relationship identified by userFollowerId.
 *
 * Updates the follower or followee user IDs and the optional soft delete field.
 *
 * Authorization: only the authenticated regular user can update their own
 * follower relationships. Validation: ensures referenced user IDs exist.
 *
 * @param props - Contains regularUser authentication, the id of the user
 *   follower, and the update body.
 * @returns The updated user follower record with ISO date strings.
 * @throws {Error} When unauthorized or when related users are not found.
 */
export async function putrecipeSharingRegularUserUserFollowersUserFollowerId(props: {
  regularUser: RegularuserPayload;
  userFollowerId: string & tags.Format<"uuid">;
  body: IRecipeSharingUserFollower.IUpdate;
}): Promise<IRecipeSharingUserFollower> {
  const { regularUser, userFollowerId, body } = props;

  const existing =
    await MyGlobal.prisma.recipe_sharing_user_followers.findUniqueOrThrow({
      where: { id: userFollowerId },
    });

  if (existing.follower_user_id !== regularUser.id) {
    throw new Error("Unauthorized");
  }

  if (body.follower_user_id !== undefined) {
    const followerExists =
      await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
        where: { id: body.follower_user_id },
      });
    if (!followerExists) throw new Error("Related follower user not found");
  }

  if (body.followee_user_id !== undefined) {
    const followeeExists =
      await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
        where: { id: body.followee_user_id },
      });
    if (!followeeExists) throw new Error("Related followee user not found");
  }

  const updated = await MyGlobal.prisma.recipe_sharing_user_followers.update({
    where: { id: userFollowerId },
    data: {
      follower_user_id: body.follower_user_id ?? undefined,
      followee_user_id: body.followee_user_id ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    follower_user_id: updated.follower_user_id,
    followee_user_id: updated.followee_user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
