import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Update an existing regular user's information by ID.
 *
 * This operation updates the email, username, or password_hash of the regular
 * user identified by the provided UUID. It preserves soft deletion status and
 * updates the updated_at timestamp.
 *
 * Access is restricted to premiumUser roles.
 *
 * @param props - The parameters for the operation
 * @param props.premiumUser - The authenticated premium user performing the
 *   update
 * @param props.id - UUID of the regular user to update
 * @param props.body - Update data for email, username, and/or password_hash
 * @returns The updated regular user data
 * @throws {Error} Throws if the regular user does not exist or is soft deleted
 */
export async function putrecipeSharingPremiumUserRegularUsersId(props: {
  premiumUser: PremiumuserPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingRegularUser.IUpdate;
}): Promise<IRecipeSharingRegularUser> {
  const { premiumUser, id, body } = props;

  // Find the existing user, ensure not soft deleted
  const existingUser =
    await MyGlobal.prisma.recipe_sharing_regularusers.findUnique({
      where: { id },
    });
  if (!existingUser || existingUser.deleted_at !== null) {
    throw new Error("Regular user not found or deleted");
  }

  // Build update data skipping undefined fields
  const updateData: IRecipeSharingRegularUser.IUpdate = {
    email: body.email ?? undefined,
    username: body.username ?? undefined,
    password_hash: body.password_hash ?? undefined,
  };

  // Set updated_at to current timestamp string
  const now = toISOStringSafe(new Date());

  // Update user
  const updated = await MyGlobal.prisma.recipe_sharing_regularusers.update({
    where: { id },
    data: {
      ...updateData,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email,
    username: updated.username,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
