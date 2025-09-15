import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new OAuth developer user account.
 *
 * This operation creates a developer in the oauth_server_developers table,
 * ensuring the email is unique and setting timestamps accurately. Only
 * administrators are authorized to perform this operation.
 *
 * @param props - Object containing admin authentication and developer creation
 *   data.
 * @param props.admin - The authenticated admin user performing the creation.
 * @param props.body - The data required to create the new developer account.
 * @returns The created OAuth developer user record with all properties.
 * @throws {Error} When a developer with the provided email already exists.
 */
export async function postoauthServerAdminOauthServerDevelopers(props: {
  admin: AdminPayload;
  body: IOauthServerDeveloper.ICreate;
}): Promise<IOauthServerDeveloper> {
  const { admin, body } = props;

  // Ensure the email does not already exist (excluding soft deleted)
  const existing = await MyGlobal.prisma.oauth_server_developers.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (existing) {
    throw new Error("Developer with this email already exists");
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_developers.create({
    data: {
      id,
      email: body.email,
      email_verified: body.email_verified,
      password_hash: body.password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    email_verified: created.email_verified,
    password_hash: created.password_hash,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
