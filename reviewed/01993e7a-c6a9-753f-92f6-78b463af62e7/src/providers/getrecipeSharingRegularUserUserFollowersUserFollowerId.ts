import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information about a user follower relationship by its
 * unique ID.
 *
 * This operation fetches the follower record identified by the provided
 * userFollowerId, returning all relevant fields including IDs of follower and
 * followee users, creation and update timestamps, and optional soft deletion
 * timestamp.
 *
 * @param props - Object containing the authenticated regular user and the
 *   follower relationship ID.
 * @param props.regularUser - The authenticated regular user making the request.
 * @param props.userFollowerId - UUID of the user follower relationship to
 *   retrieve.
 * @returns The user follower relationship details conforming to
 *   IRecipeSharingUserFollower.
 * @throws {Error} Throws if the user follower relationship is not found.
 */
export async function getrecipeSharingRegularUserUserFollowersUserFollowerId(props: {
  regularUser: RegularuserPayload;
  userFollowerId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingUserFollower> {
  const { userFollowerId } = props;

  const record =
    await MyGlobal.prisma.recipe_sharing_user_followers.findUniqueOrThrow({
      where: { id: userFollowerId },
    });

  return {
    id: record.id,
    follower_user_id: record.follower_user_id,
    followee_user_id: record.followee_user_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
