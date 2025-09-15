import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerIdToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new OAuth ID token.
 *
 * This function creates an entry in the oauth_server_id_tokens table
 * representing an OpenID Connect ID token. It requires the authenticated member
 * and the creation data conforming to IOauthServerIdToken.ICreate.
 *
 * @param props - Object containing the authenticated member and creation
 *   payload.
 * @param props.member - Authenticated member performing the creation.
 * @param props.body - New ID token create payload conforming to
 *   IOauthServerIdToken.ICreate.
 * @returns The newly created IOauthServerIdToken entity.
 * @throws {Error} Throws if creation fails or validation errors arise.
 */
export async function postoauthServerMemberIdTokens(props: {
  member: MemberPayload;
  body: IOauthServerIdToken.ICreate;
}): Promise<IOauthServerIdToken> {
  const { member, body } = props;

  // Generate a new UUID for the ID token record
  const id = v4() as string & tags.Format<"uuid">;

  // Current timestamp as ISO string with branding
  const now = toISOStringSafe(new Date());

  // Create the ID token record in the database
  const created = await MyGlobal.prisma.oauth_server_id_tokens.create({
    data: {
      id,
      oauth_client_id: body.oauth_client_id,
      authorization_code_id: body.authorization_code_id ?? null,
      token: body.token,
      expires_at: toISOStringSafe(body.expires_at),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the record with all date fields converted and nullable fields handled
  return {
    id: created.id,
    oauth_client_id: created.oauth_client_id,
    authorization_code_id: created.authorization_code_id ?? null,
    token: created.token,
    expires_at: toISOStringSafe(created.expires_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
