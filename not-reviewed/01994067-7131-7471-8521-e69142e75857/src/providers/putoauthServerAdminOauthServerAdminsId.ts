import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerAdmins";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing OAuth server admin user.
 *
 * This endpoint modifies fields such as email, email verification flag,
 * password hash, and soft deletion timestamp for the specified admin user. Only
 * authenticated admins may perform this operation.
 *
 * @param props - Object containing authenticated admin, target id, and update
 *   data
 * @param props.admin - Authenticated admin payload performing the update
 * @param props.id - UUID identifying the OAuth admin user to update
 * @param props.body - Update payload with fields to modify
 * @returns Updated OAuth admin user record
 * @throws {Error} If the specified admin user does not exist or is soft deleted
 */
export async function putoauthServerAdminOauthServerAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerOauthServerAdmins.IUpdate;
}): Promise<IOauthServerOauthServerAdmins> {
  const { admin, id, body } = props;

  // Ensure the target admin exists and is not soft deleted
  const existingAdmin =
    await MyGlobal.prisma.oauth_server_admins.findFirstOrThrow({
      where: {
        id,
        deleted_at: null,
      },
    });

  // Current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Perform the update with only provided fields
  const updatedAdmin = await MyGlobal.prisma.oauth_server_admins.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      email_verified: body.email_verified ?? undefined,
      password_hash: body.password_hash ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  // Return the updated admin entity, converting Date fields to ISO strings
  return {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    email_verified: updatedAdmin.email_verified,
    password_hash: updatedAdmin.password_hash,
    created_at: toISOStringSafe(updatedAdmin.created_at),
    updated_at: toISOStringSafe(updatedAdmin.updated_at),
    deleted_at: updatedAdmin.deleted_at
      ? toISOStringSafe(updatedAdmin.deleted_at)
      : null,
  };
}
