import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Retrieve detailed information of a regular user by ID.
 *
 * This function fetches user data from the recipe_sharing_regularusers table,
 * excluding sensitive fields such as password_hash for security.
 *
 * @param props - Request props containing premium user auth and target user ID
 * @param props.premiumUser - The authenticated premium user making the request
 * @param props.id - Unique identifier of the regular user to retrieve
 * @returns Detailed information of the requested regular user
 * @throws {Error} Throws if the user with the given ID cannot be found
 */
export async function getrecipeSharingPremiumUserRegularUsersId(props: {
  premiumUser: PremiumuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingRegularUser> {
  const { id } = props;

  const user =
    await MyGlobal.prisma.recipe_sharing_regularusers.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
  };
}
