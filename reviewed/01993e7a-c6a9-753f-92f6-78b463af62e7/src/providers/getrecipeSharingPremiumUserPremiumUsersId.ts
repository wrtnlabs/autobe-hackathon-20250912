import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Retrieve detailed premium user information by ID.
 *
 * This operation fetches the premium user record from the database, excluding
 * sensitive fields such as the password hash. It enforces authorization: only
 * the premium user themselves can retrieve their profile data.
 *
 * @param props - Contains the authenticated premiumUser payload and the
 *   requested premium user ID.
 * @param props.premiumUser - Authenticated premium user payload.
 * @param props.id - The unique UUID of the premium user to retrieve.
 * @returns The premium user's profile data without sensitive information.
 * @throws {Error} When the user is not authorized to access the data.
 * @throws {Error} When the premium user does not exist or is soft deleted.
 */
export async function getrecipeSharingPremiumUserPremiumUsersId(props: {
  premiumUser: PremiumuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingPremiumUser> {
  const { premiumUser, id } = props;

  if (premiumUser.id !== id) {
    throw new Error("Unauthorized access to premium user data");
  }

  const record = await MyGlobal.prisma.recipe_sharing_premiumusers.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  });

  if (record === null) {
    throw new Error("Premium user not found or deleted");
  }

  return {
    id: record.id,
    email: record.email,
    username: record.username,
    premium_since: toISOStringSafe(record.premium_since),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
