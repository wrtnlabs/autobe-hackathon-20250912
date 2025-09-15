import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Update premium user details by ID
 *
 * Updates profile details of an existing premium user identified by UUID. This
 * operation modifies allowed fields in the recipe_sharing_premiumusers table
 * such as email, username, and premium_since timestamp. Access control
 * restricts updates to the user themselves or authorized administrators with
 * roles 'regularUser' or 'premiumUser'. Password and soft delete fields are not
 * modifiable with this operation to ensure security and data integrity.
 * Validation ensures uniquely constrained fields like email and username remain
 * valid upon update.
 *
 * @param props - Object containing premiumUser authorization payload, target
 *   user id, and update body
 * @param props.premiumUser - The authenticated premiumUser making the request
 * @param props.id - UUID of the premium user to update
 * @param props.body - Body with fields to update: email, username,
 *   premium_since
 * @returns Updated premium user details excluding sensitive credentials
 * @throws {Error} Unauthorized when the user tries to update another user's
 *   profile
 * @throws {Error} When the premium user with provided id does not exist
 */
export async function putrecipeSharingPremiumUserPremiumUsersId(props: {
  premiumUser: PremiumuserPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingPremiumUser.IUpdate;
}): Promise<IRecipeSharingPremiumUser> {
  const { premiumUser, id, body } = props;

  // Fetch user, exclude deleted users (deleted_at should be null)
  const existingUser =
    await MyGlobal.prisma.recipe_sharing_premiumusers.findUniqueOrThrow({
      where: { id },
    });

  // Authorization: only allow the user to modify their own profile
  if (premiumUser.id !== existingUser.id) {
    throw new Error("Unauthorized: You can only update your own profile");
  }

  // Prepare update data
  const updateData: {
    email?: string | null | undefined;
    username?: string | null | undefined;
    premium_since?: (string & tags.Format<"date-time">) | null | undefined;
  } = {};

  if ("email" in body) {
    updateData.email = body.email ?? undefined;
  }
  if ("username" in body) {
    updateData.username = body.username ?? undefined;
  }
  if ("premium_since" in body) {
    updateData.premium_since =
      body.premium_since === null ? null : (body.premium_since ?? undefined);
  }

  // Execute update
  const updated = await MyGlobal.prisma.recipe_sharing_premiumusers.update({
    where: { id },
    data: updateData,
  });

  // Return updated user with converted date fields
  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    premium_since: updated.premium_since
      ? toISOStringSafe(updated.premium_since)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
