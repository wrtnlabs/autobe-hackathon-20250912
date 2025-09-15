import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information of a premium user by their unique identifier.
 *
 * This operation fetches all standard profile data from the
 * recipe_sharing_premiumusers record excluding sensitive fields like
 * password_hash.
 *
 * Authorization checks ensure that a regular user can only view their own
 * premium user information.
 *
 * If the premium user record is soft deleted or non-existent, a 404 error is
 * thrown.
 *
 * @param props - Object containing the authenticated regular user and target
 *   premium user ID
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.id - The premium user UUID to retrieve
 * @returns Detailed premium user information excluding sensitive data
 * @throws {Error} Unauthorized when accessing another user's data
 * @throws {Error} Not found if the premium user does not exist or is deleted
 */
export async function getrecipeSharingRegularUserPremiumUsersId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingPremiumUser> {
  const { regularUser, id } = props;

  if (regularUser.id !== id) {
    throw new Error(
      "Unauthorized: You can only view your own premium user data",
    );
  }

  const premiumUserRecord =
    await MyGlobal.prisma.recipe_sharing_premiumusers.findFirstOrThrow({
      where: { id, deleted_at: null },
      select: {
        id: true,
        email: true,
        username: true,
        premium_since: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: premiumUserRecord.id,
    email: premiumUserRecord.email,
    username: premiumUserRecord.username,
    premium_since: toISOStringSafe(premiumUserRecord.premium_since),
    created_at: toISOStringSafe(premiumUserRecord.created_at),
    updated_at: toISOStringSafe(premiumUserRecord.updated_at),
    deleted_at: premiumUserRecord.deleted_at
      ? toISOStringSafe(premiumUserRecord.deleted_at)
      : null,
  };
}
