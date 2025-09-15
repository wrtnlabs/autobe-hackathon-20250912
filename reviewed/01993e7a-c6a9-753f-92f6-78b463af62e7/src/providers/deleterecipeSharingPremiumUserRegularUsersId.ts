import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Permanently delete a regular user by ID.
 *
 * This operation performs a hard delete on the recipe_sharing_regularusers
 * table, completely removing the user record from the database, bypassing any
 * soft deletion.
 *
 * Access is restricted to premiumUser role, which is assumed to be validated by
 * an authentication decorator.
 *
 * @param props - Object containing premiumUser payload and the user ID to
 *   delete
 * @param props.premiumUser - The authenticated premium user performing the
 *   operation
 * @param props.id - UUID of the regular user to delete
 * @throws {Error} If no user exists with the specified ID
 */
export async function deleterecipeSharingPremiumUserRegularUsersId(props: {
  premiumUser: PremiumuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { premiumUser, id } = props;

  const user = await MyGlobal.prisma.recipe_sharing_regularusers.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await MyGlobal.prisma.recipe_sharing_regularusers.delete({
    where: { id },
  });
}
