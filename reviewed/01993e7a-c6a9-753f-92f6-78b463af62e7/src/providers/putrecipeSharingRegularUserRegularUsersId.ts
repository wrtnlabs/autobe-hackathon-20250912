import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update an existing regular user's information by ID.
 *
 * This provider updates the email, username, and password_hash fields for a
 * regular user identified by their UUID. It ensures uniqueness of email and
 * username before performing the update. The user's timestamps are handled
 * appropriately in ISO string format.
 *
 * Soft deletion timestamp (deleted_at) is not modifiable here.
 *
 * @param props - The property object containing the authenticated regularUser,
 *   the user's ID to update, and the updated data body.
 * @param props.regularUser - The authenticated regular user payload.
 * @param props.id - The UUID of the user to update.
 * @param props.body - The partial update data for the user.
 * @returns The updated regular user data excluding sensitive password handling.
 * @throws {Error} Throws if the user does not exist.
 * @throws {Error} Throws if the new email or username already exists.
 */
export async function putrecipeSharingRegularUserRegularUsersId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingRegularUser.IUpdate;
}): Promise<IRecipeSharingRegularUser> {
  const { regularUser, id, body } = props;

  // Fetch user by id with deleted_at null
  const existingUser =
    await MyGlobal.prisma.recipe_sharing_regularusers.findUnique({
      where: { id },
    });
  if (!existingUser || existingUser.deleted_at !== null) {
    throw new Error("User not found");
  }

  // Check email uniqueness
  if (body.email !== undefined) {
    const emailConflict =
      await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
        where: {
          email: body.email,
          NOT: { id },
          deleted_at: null,
        },
      });
    if (emailConflict) {
      throw new Error("Email already in use");
    }
  }

  // Check username uniqueness
  if (body.username !== undefined) {
    const usernameConflict =
      await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
        where: {
          username: body.username,
          NOT: { id },
          deleted_at: null,
        },
      });
    if (usernameConflict) {
      throw new Error("Username already in use");
    }
  }

  // Prepare update data
  const now = toISOStringSafe(new Date());

  const updateData = {
    email: body.email ?? undefined,
    username: body.username ?? undefined,
    password_hash: body.password_hash ?? undefined,
    updated_at: now,
  };

  // Update user
  const updated = await MyGlobal.prisma.recipe_sharing_regularusers.update({
    where: { id },
    data: updateData,
  });

  // Return user object with proper date string conversions
  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
