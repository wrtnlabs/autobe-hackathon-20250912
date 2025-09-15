import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Delete a user tag suggestion permanently from the database.
 *
 * This operation targets the recipe_sharing_user_tags table and performs a hard
 * delete. Only the owning regular user may delete their own tag suggestion.
 *
 * @param props - Object containing the regularUser payload and the tagId to
 *   delete
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion
 * @param props.tagId - UUID of the user tag suggestion to delete
 * @throws {Error} When the specified user tag is not found
 * @throws {Error} When the deleting user is not the owner of the tag
 */
export async function deleterecipeSharingRegularUserUserTagsTagId(props: {
  regularUser: RegularuserPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, tagId } = props;

  // Fetch the user tag by id, or throw if not found
  const userTag =
    await MyGlobal.prisma.recipe_sharing_user_tags.findUniqueOrThrow({
      where: { id: tagId },
    });

  // Verify ownership authorization
  if (userTag.user_id !== regularUser.id) {
    throw new Error("Unauthorized: You can only delete your own user tag");
  }

  // Perform hard delete of the user tag
  await MyGlobal.prisma.recipe_sharing_user_tags.delete({
    where: { id: tagId },
  });
}
