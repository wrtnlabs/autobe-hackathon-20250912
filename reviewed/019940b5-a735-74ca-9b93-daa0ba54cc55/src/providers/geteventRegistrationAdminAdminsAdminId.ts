import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information about a specific admin user identified by their
 * unique ID.
 *
 * This operation is intended for administrative use and returns data such as
 * email, full name, phone number, profile picture, and email verification
 * status.
 *
 * Admin-only access is strictly enforced. The response includes timestamps for
 * creation and updates, supporting audit requirements.
 *
 * @param props - Object containing admin authentication and target admin ID.
 * @param props.admin - The authenticated admin making the request.
 * @param props.adminId - Unique identifier (UUID) of the target admin user.
 * @returns Detailed information of the requested admin user.
 * @throws {Error} If no admin user is found with the provided ID.
 */
export async function geteventRegistrationAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationAdmin> {
  const { admin, adminId } = props;

  const adminRecord =
    await MyGlobal.prisma.event_registration_admins.findUniqueOrThrow({
      where: { id: adminId },
    });

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    password_hash: adminRecord.password_hash,
    full_name: adminRecord.full_name,
    phone_number: adminRecord.phone_number ?? undefined,
    profile_picture_url: adminRecord.profile_picture_url ?? undefined,
    email_verified: adminRecord.email_verified,
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
  };
}
