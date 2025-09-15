import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRefreshToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Creates a new opaque OAuth refresh token.
 *
 * This operation accepts an OAuth client ID, optional authorization code ID,
 * token string, scopes, and expiration timestamp, then creates a new refresh
 * token in the database.
 *
 * Authorization is restricted to authenticated members.
 *
 * @param props - Object containing authenticated member and token creation data
 * @param props.member - Authenticated member payload
 * @param props.body - Token creation data adhering to
 *   IOauthServerRefreshToken.ICreate
 * @returns Newly created IOauthServerRefreshToken object
 * @throws {Error} When Prisma client fails to create the record
 */
export async function postoauthServerMemberRefreshTokens(props: {
  member: MemberPayload;
  body: IOauthServerRefreshToken.ICreate;
}): Promise<IOauthServerRefreshToken> {
  const { member, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_refresh_tokens.create({
    data: {
      id,
      oauth_client_id: body.oauth_client_id,
      authorization_code_id:
        body.authorization_code_id === null
          ? null
          : (body.authorization_code_id ?? undefined),
      token: body.token,
      scope: body.scope,
      expires_at: body.expires_at,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    oauth_client_id: created.oauth_client_id,
    authorization_code_id:
      created.authorization_code_id === null
        ? null
        : (created.authorization_code_id ?? undefined),
    token: created.token,
    scope: created.scope,
    expires_at: created.expires_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at:
      created.deleted_at === null ? null : (created.deleted_at ?? undefined),
  };
}
