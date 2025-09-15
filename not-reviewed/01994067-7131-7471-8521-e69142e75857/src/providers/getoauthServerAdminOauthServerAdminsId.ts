import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerAdmins";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get specific OAuth server admin user by ID
 *
 * Retrieves detailed information of a specific OAuth server administrator by
 * their unique ID. Access is restricted to authenticated users with the 'admin'
 * role. Returns all admin properties including email, verification flag,
 * password hash, and audit timestamps. Throws if the admin is not found or has
 * been soft deleted.
 *
 * @param props - Object containing the admin payload and target admin user ID
 * @param props.admin - The authenticated admin payload making the request
 * @param props.id - The UUID of the OAuth server admin user to retrieve
 * @returns Promise resolving to detailed OAuth server admin user data
 * @throws Error if admin user with specified ID is not found or soft deleted
 */
export async function getoauthServerAdminOauthServerAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerOauthServerAdmins> {
  const record = await MyGlobal.prisma.oauth_server_admins.findFirstOrThrow({
    where: {
      id: props.id,
      deleted_at: null,
    },
  });

  return {
    id: record.id,
    email: record.email,
    email_verified: record.email_verified,
    password_hash: record.password_hash,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
