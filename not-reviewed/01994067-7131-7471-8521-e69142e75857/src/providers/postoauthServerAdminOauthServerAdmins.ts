import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerAdmins";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new OAuth server admin user.
 *
 * This operation creates a new administrator user record in the
 * oauth_server_admins table. It requires an authenticated admin user to perform
 * the creation. It generates a new UUID for the admin id and sets created_at
 * and updated_at timestamps.
 *
 * @param props - Object containing the authenticated admin and the admin
 *   creation data
 * @param props.admin - The authenticated admin payload performing this
 *   operation
 * @param props.body - Creation data containing email, email_verified, and
 *   password_hash
 * @returns The created OAuth server admin user record with all fields populated
 * @throws {Error} Throws if the email is already in use or other database
 *   constraints fail
 */
export async function postoauthServerAdminOauthServerAdmins(props: {
  admin: AdminPayload;
  body: IOauthServerOauthServerAdmins.ICreate;
}): Promise<IOauthServerOauthServerAdmins> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.oauth_server_admins.create({
    data: {
      id,
      email: body.email,
      email_verified: body.email_verified,
      password_hash: body.password_hash,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    email: created.email,
    email_verified: created.email_verified,
    password_hash: created.password_hash,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
