import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRefreshToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get detailed information for a specific OAuth refresh token by ID.
 *
 * This function retrieves the refresh token record from the database, including
 * the token string, scopes granted, expiration datetime, associated OAuth
 * client ID, and the optional authorization code ID.
 *
 * All datetime fields are returned as ISO 8601 strings with the appropriate
 * branding.
 *
 * Authorization is handled externally and the member payload must represent the
 * authenticated member requesting access.
 *
 * @param props - Contains the authenticated member and the unique ID of the
 *   refresh token to retrieve.
 * @param props.member - The authenticated member payload.
 * @param props.id - The UUID of the refresh token to retrieve.
 * @returns The detailed OAuth refresh token information.
 * @throws {Error} If the refresh token with the specified ID does not exist.
 */
export async function getoauthServerMemberRefreshTokensId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerRefreshToken> {
  const { member, id } = props;

  const token =
    await MyGlobal.prisma.oauth_server_refresh_tokens.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: token.id,
    oauth_client_id: token.oauth_client_id,
    authorization_code_id: token.authorization_code_id ?? null,
    token: token.token,
    scope: token.scope,
    expires_at: toISOStringSafe(token.expires_at),
    created_at: toISOStringSafe(token.created_at),
    updated_at: toISOStringSafe(token.updated_at),
    deleted_at: token.deleted_at ? toISOStringSafe(token.deleted_at) : null,
  };
}
