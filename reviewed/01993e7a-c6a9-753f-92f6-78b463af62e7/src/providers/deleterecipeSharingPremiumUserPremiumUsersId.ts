import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Deletes a premium user permanently by their unique identifier.
 *
 * This operation performs a hard delete on the recipe_sharing_premiumusers
 * table. Only users with the 'premiumUser' role are authorized to perform this
 * action.
 *
 * @param props - Object containing the authenticated premium user payload and
 *   the target user's UUID.
 * @param props.premiumUser - Authenticated premium user performing the
 *   deletion.
 * @param props.id - UUID of the premium user to delete.
 * @returns Void
 * @throws {Error} Throws an error if the premium user does not exist or is
 *   already deleted.
 */
export async function deleterecipeSharingPremiumUserPremiumUsersId(props: {
  premiumUser: PremiumuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { premiumUser, id } = props;

  // Verify existence of the premium user
  const existingUser =
    await MyGlobal.prisma.recipe_sharing_premiumusers.findFirst({
      where: {
        id: id,
        deleted_at: null,
      },
    });
  if (!existingUser) {
    throw new Error("Premium user not found");
  }

  // Hard delete the premium user record
  await MyGlobal.prisma.recipe_sharing_premiumusers.delete({
    where: { id: id },
  });
}
