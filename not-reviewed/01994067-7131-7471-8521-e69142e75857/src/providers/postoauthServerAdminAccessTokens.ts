import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new OAuth access token.
 *
 * This operation creates a fresh OAuth access token record in the database,
 * linking it to the specified OAuth client and optionally an authorization
 * code. It supports tracking token scopes and expiration times.
 *
 * @param props - Object containing the authenticated admin payload and request
 *   body
 * @param props.admin - Authenticated admin making this request
 * @param props.body - Token creation details including client ID, token string,
 *   scopes, and expiration
 * @returns The newly created OAuth access token entity with all fields
 *   populated
 * @throws {Error} Throws errors if token creation fails due to DB constraints
 *   or invalid references
 */
export async function postoauthServerAdminAccessTokens(props: {
  admin: AdminPayload;
  body: IOauthServerAccessToken.ICreate;
}): Promise<IOauthServerAccessToken> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const { admin, body } = props;

  const created = await MyGlobal.prisma.oauth_server_access_tokens.create({
    data: {
      id,
      oauth_client_id: body.oauth_client_id,
      authorization_code_id: body.authorization_code_id ?? null,
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
    authorization_code_id: created.authorization_code_id ?? null,
    token: created.token,
    scope: created.scope,
    expires_at: created.expires_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
