import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update a user-suggested tag identified by tagId.
 *
 * Allows the authenticated regular user to modify their own user tag
 * suggestion. Only the owner can update the tag. Updates may include tag_id,
 * suggested_name, and/or status. The updated_at timestamp is refreshed
 * automatically.
 *
 * @param props - Object containing authentication, path parameter, and update
 *   body
 * @param props.regularUser - Authenticated regular user payload
 * @param props.tagId - UUID identifier of the user tag to update
 * @param props.body - Partial update object for user tag
 * @returns The updated user tag entity with date fields formatted as ISO
 *   strings
 * @throws {Error} When the tag is not owned by the user
 * @throws {Error} When the tagId does not exist
 */
export async function putrecipeSharingRegularUserUserTagsTagId(props: {
  regularUser: RegularuserPayload;
  tagId: string & tags.Format<"uuid">;
  body: IRecipeSharingUserTags.IUpdate;
}): Promise<IRecipeSharingUserTags> {
  const { regularUser, tagId, body } = props;

  const existingTag =
    await MyGlobal.prisma.recipe_sharing_user_tags.findUniqueOrThrow({
      where: { id: tagId },
    });

  if (existingTag.user_id !== regularUser.id) {
    throw new Error("Unauthorized: You can only update your own user tags.");
  }

  const updateData = {
    tag_id: body.tag_id !== undefined ? body.tag_id : undefined,
    suggested_name:
      body.suggested_name !== undefined ? body.suggested_name : undefined,
    status: body.status !== undefined ? body.status : undefined,

    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.recipe_sharing_user_tags.update({
    where: { id: tagId },
    data: updateData,
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    tag_id: updated.tag_id === null ? null : (updated.tag_id ?? undefined),
    suggested_name: updated.suggested_name,
    status: updated.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
