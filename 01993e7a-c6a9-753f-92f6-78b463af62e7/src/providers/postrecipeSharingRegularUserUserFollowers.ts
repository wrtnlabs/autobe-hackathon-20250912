import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Creates a new user follower relationship.
 *
 * This operation allows an authenticated regular user to follow another user.
 * It verifies the follower matches the authenticated user, ensures both users
 * exist and are not deleted, and prevents duplicate following relationships.
 *
 * @param props - The request properties including authenticated regular user
 *   and follower details
 * @param props.regularUser - Authenticated regular user payload
 * @param props.body - The body containing follower_user_id and followee_user_id
 * @returns The created user follower relationship
 * @throws {Error} When follower_user_id does not match authenticated user id
 * @throws {Error} When follower or followee user does not exist or is deleted
 * @throws {Error} When duplicate follower relationship exists
 */
export async function postrecipeSharingRegularUserUserFollowers(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingUserFollower.ICreate;
}): Promise<IRecipeSharingUserFollower> {
  const { regularUser, body } = props;

  if (regularUser.id !== body.follower_user_id) {
    throw new Error(
      "Unauthorized: follower_user_id must match authenticated user ID",
    );
  }

  const followerUser =
    await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
      where: { id: regularUser.id, deleted_at: null },
    });
  if (!followerUser) throw new Error("Follower user not found or deleted");

  const followeeUser =
    await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
      where: { id: body.followee_user_id, deleted_at: null },
    });
  if (!followeeUser) throw new Error("Followee user not found or deleted");

  const existingRelation =
    await MyGlobal.prisma.recipe_sharing_user_followers.findFirst({
      where: {
        follower_user_id: body.follower_user_id,
        followee_user_id: body.followee_user_id,
        deleted_at: null,
      },
    });
  if (existingRelation) throw new Error("Duplicate follower relationship");

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.recipe_sharing_user_followers.create({
    data: {
      id: newId,
      follower_user_id: body.follower_user_id,
      followee_user_id: body.followee_user_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    follower_user_id: created.follower_user_id,
    followee_user_id: created.followee_user_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
