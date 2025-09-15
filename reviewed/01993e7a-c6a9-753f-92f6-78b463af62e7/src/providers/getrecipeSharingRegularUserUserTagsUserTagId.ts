import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information of a user-generated tag suggestion by ID.
 *
 * This operation queries the recipe_sharing_user_tags table for the specified
 * tagId. Returns detailed information including user association, tag names,
 * moderation status, and timestamps.
 *
 * Requires authorization to ensure secure access: the requester must be the
 * owner of the tag.
 *
 * @param props - Object containing the authenticated regular user and the user
 *   tag ID
 * @param props.regularUser - Authenticated regular user payload with ID
 * @param props.userTagId - UUID of the user tag to retrieve
 * @returns Detailed user tag information conforming to IRecipeSharingUserTags
 * @throws {Error} If the tag does not exist or the regularUser is not the owner
 */
export async function getrecipeSharingRegularUserUserTagsUserTagId(props: {
  regularUser: RegularuserPayload;
  userTagId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingUserTags> {
  const { regularUser, userTagId } = props;

  const userTag =
    await MyGlobal.prisma.recipe_sharing_user_tags.findUniqueOrThrow({
      where: { id: userTagId },
    });

  if (userTag.user_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this user tag");
  }

  return {
    id: userTag.id,
    user_id: userTag.user_id,
    tag_id: userTag.tag_id ?? null,
    suggested_name: userTag.suggested_name,
    status: userTag.status,
    created_at: toISOStringSafe(userTag.created_at),
    updated_at: toISOStringSafe(userTag.updated_at),
  };
}
