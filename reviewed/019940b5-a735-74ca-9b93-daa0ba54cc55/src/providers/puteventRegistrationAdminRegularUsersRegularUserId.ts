import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update regular user profile by ID.
 *
 * This operation updates the profile information of a regular user identified
 * by their unique ID. Only authorized admins can perform this update to ensure
 * data integrity and security. The fields that can be updated includes email,
 * password_hash, full name, phone number, profile picture URL, and email
 * verification status.
 *
 * @param props - Object containing admin authentication, target user ID, and
 *   update data body following IEventRegistrationRegularUser.IUpdate
 *   interface.
 * @param props.admin - Authenticated admin user making the update.
 * @param props.regularUserId - UUID of the regular user to be updated.
 * @param props.body - Fields to be updated on the regular user's profile.
 * @returns Updated user entity with all fields including timestamps.
 * @throws {Error} If the target user is not found.
 */
export async function puteventRegistrationAdminRegularUsersRegularUserId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationRegularUser.IUpdate;
}): Promise<IEventRegistrationRegularUser> {
  const { admin, regularUserId, body } = props;

  // Verify user exists
  const user =
    await MyGlobal.prisma.event_registration_regular_users.findUniqueOrThrow({
      where: { id: regularUserId },
    });

  // Prepare data for update
  const updatedData: IEventRegistrationRegularUser.IUpdate = {
    email: body.email ?? undefined,
    password_hash: body.password_hash ?? undefined,
    full_name: body.full_name ?? undefined,
    phone_number:
      body.phone_number === null ? null : (body.phone_number ?? undefined),
    profile_picture_url:
      body.profile_picture_url === null
        ? null
        : (body.profile_picture_url ?? undefined),
    email_verified: body.email_verified ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform update
  const updated = await MyGlobal.prisma.event_registration_regular_users.update(
    {
      where: { id: regularUserId },
      data: updatedData,
    },
  );

  // Return the updated user with correct types and date strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email,
    password_hash: updated.password_hash,
    full_name: updated.full_name,
    phone_number: updated.phone_number ?? null,
    profile_picture_url: updated.profile_picture_url ?? null,
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
