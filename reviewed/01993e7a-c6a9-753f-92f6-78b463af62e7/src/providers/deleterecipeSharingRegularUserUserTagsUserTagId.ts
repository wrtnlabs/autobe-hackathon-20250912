import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Delete user-generated tag suggestion by ID.
 *
 * This function deletes a user tag suggestion record from the database
 * completely. Only the owner of the tag suggestion (regularUser) may perform
 * this action.
 *
 * @param props - The properties object.
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion.
 * @param props.userTagId - The UUID of the user tag suggestion to delete.
 * @returns {Promise<void>} No return value.
 * @throws {Error} When the user tag suggestion is not found.
 * @throws {Error} When the user is unauthorized to delete the tag suggestion.
 */
export async function deleterecipeSharingRegularUserUserTagsUserTagId(props: {
  regularUser: RegularuserPayload;
  userTagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, userTagId } = props;

  const userTag = await MyGlobal.prisma.recipe_sharing_user_tags.findUnique({
    where: { id: userTagId },
  });

  if (userTag === null) {
    throw new Error("User tag not found");
  }

  if (userTag.user_id !== regularUser.id) {
    throw new Error("Unauthorized to delete this tag suggestion");
  }

  await MyGlobal.prisma.recipe_sharing_user_tags.delete({
    where: { id: userTagId },
  });
}
