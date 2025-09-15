import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

/**
 * Create a new OAuth server member account.
 *
 * This operation accepts member creation data including email and plaintext
 * password. The password is hashed securely before storage. The member record
 * is created with audit timestamps and a unique UUID.
 *
 * @param props - Object containing the body field with member creation data.
 * @param props.body - Member creation payload including email and plaintext
 *   password.
 * @returns The newly created OAuth server member record.
 * @throws {Error} Throws if creation fails or email is duplicated.
 */
export async function postoauthServerOauthServerMembers(props: {
  body: IOauthServerMember.ICreate;
}): Promise<IOauthServerMember> {
  const { body } = props;

  // Hash the plaintext password securely
  const hashedPassword = await MyGlobal.password.hash(body.password);

  // Current timestamp for created_at and updated_at fields
  const now = toISOStringSafe(new Date());

  // Generate UUID for new member
  const newId = v4() as string & tags.Format<"uuid">;

  // Create new member record in database
  const created = await MyGlobal.prisma.oauth_server_members.create({
    data: {
      id: newId,
      email: body.email,
      email_verified: false,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  // Return created member data with formatted dates
  return {
    id: created.id as string & tags.Format<"uuid">,
    email: created.email,
    email_verified: created.email_verified,
    password_hash: created.password_hash,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
