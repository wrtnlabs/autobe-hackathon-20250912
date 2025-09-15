import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information about a regular user by their unique ID.
 *
 * This operation is intended for admin use or authorized contexts where
 * sensitive user data must be accessed securely.
 *
 * @param props - Object containing admin authentication and the regular user's
 *   UUID.
 * @param props.admin - The authenticated admin making the request.
 * @param props.regularUserId - UUID of the regular user to retrieve.
 * @returns Detailed regular user profile information matching Prisma schema.
 * @throws {Error} Throws if the user with the given ID does not exist.
 */
export async function geteventRegistrationAdminRegularUsersRegularUserId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationRegularUser> {
  const { admin, regularUserId } = props;

  const user =
    await MyGlobal.prisma.event_registration_regular_users.findUniqueOrThrow({
      where: { id: regularUserId },
      select: {
        id: true,
        email: true,
        password_hash: true,
        full_name: true,
        phone_number: true,
        profile_picture_url: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    full_name: user.full_name,
    phone_number: user.phone_number ?? null,
    profile_picture_url: user.profile_picture_url ?? null,
    email_verified: user.email_verified,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
