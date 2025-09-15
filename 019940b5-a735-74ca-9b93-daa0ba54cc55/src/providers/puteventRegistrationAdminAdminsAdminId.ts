import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an administrator user by ID
 *
 * This operation updates an admin user record in the event_registration_admins
 * table. The admin user is identified by their unique UUID. It allows
 * modification of the admin's email, password hash, full name, phone number,
 * profile picture URL, and email verification status. Access to this operation
 * is restricted to users with the 'admin' role.
 *
 * @param props - Object containing admin authorization, target adminId, and
 *   update data
 * @param props.admin - The authenticated admin performing the update
 * @param props.adminId - Unique identifier of the admin user to update
 * @param props.body - Partial admin user data to update
 * @returns Updated administrator user information conforming to
 *   IEventRegistrationAdmin
 * @throws {Error} When the target admin user is not found
 */
export async function puteventRegistrationAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEventRegistrationAdmin.IUpdate;
}): Promise<IEventRegistrationAdmin> {
  const { admin, adminId, body } = props;

  // Verify the admin user to update exists
  const existingAdmin =
    await MyGlobal.prisma.event_registration_admins.findUnique({
      where: { id: adminId },
    });

  if (!existingAdmin) {
    throw new Error("Admin not found");
  }

  // Update the admin user record
  const updated = await MyGlobal.prisma.event_registration_admins.update({
    where: { id: adminId },
    data: {
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
    },
  });

  // Return the updated admin user with date fields converted to ISO strings
  return {
    id: updated.id,
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
