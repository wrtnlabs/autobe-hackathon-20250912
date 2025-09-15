import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Permanently delete a regular user from the database by their unique ID.
 *
 * This operation performs a hard delete on the `recipe_sharing_regularusers`
 * table, bypassing any soft delete mechanisms such as the `deleted_at`
 * timestamp.
 *
 * Access is restricted to authenticated regular users.
 *
 * @param props - Object containing authentication and path parameter
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion
 * @param props.id - The UUID of the regular user to delete
 * @returns {Promise<void>} No content is returned upon successful deletion
 * @throws {Error} When the user with the provided ID does not exist
 */
export async function deleterecipeSharingRegularUserRegularUsersId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, id } = props;

  // Validate existence of user to delete
  await MyGlobal.prisma.recipe_sharing_regularusers.findUniqueOrThrow({
    where: { id },
  });

  // Hard delete user record
  await MyGlobal.prisma.recipe_sharing_regularusers.delete({
    where: { id },
  });
}
