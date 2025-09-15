import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new administrator user account with identity credentials and contact
 * information.
 *
 * Only authorized admin users can perform this operation.
 *
 * The request body must include email, password hash, full name, optional phone
 * number, profile picture URL, and email verification status.
 *
 * Successful creation returns the detailed user record, excluding sensitive
 * password hash.
 *
 * Duplicate email addresses are rejected to maintain email uniqueness.
 *
 * @param props - Object containing the admin performing the operation and the
 *   admin user data to create
 * @param props.admin - The authenticated admin performing the creation
 * @param props.body - The data for creating a new admin user
 * @returns The newly created admin user without the password hash
 * @throws {Error} When a creation fails due to duplicate email or other
 *   database constraints
 */
export async function posteventRegistrationAdminAdmins(props: {
  admin: AdminPayload;
  body: IEventRegistrationAdmin.ICreate;
}): Promise<IEventRegistrationAdmin> {
  const { admin, body } = props;

  // Authorization is assumed to be handled by decorators or middleware

  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.event_registration_admins.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: body.password_hash,
      full_name: body.full_name,
      phone_number: body.phone_number ?? null,
      profile_picture_url: body.profile_picture_url ?? null,
      email_verified: body.email_verified,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    email: created.email,
    full_name: created.full_name,
    phone_number: created.phone_number ?? null,
    profile_picture_url: created.profile_picture_url ?? null,
    email_verified: created.email_verified,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
