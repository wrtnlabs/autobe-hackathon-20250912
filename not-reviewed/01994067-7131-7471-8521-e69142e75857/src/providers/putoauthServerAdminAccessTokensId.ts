import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing OAuth access token identified by its unique ID.
 *
 * This operation modifies token properties such as token string, scope,
 * expiration, and associates related client and authorization code data as
 * needed.
 *
 * @param props - The function parameters including authentication, token ID,
 *   and update data.
 * @param props.admin - The authenticated admin performing the update.
 * @param props.id - The unique ID of the OAuth access token to update.
 * @param props.body - Partial update data conforming to
 *   IOauthServerAccessToken.IUpdate.
 * @returns The updated OAuth access token entity with all relevant fields.
 * @throws {Error} Throws error if the specified access token does not exist.
 */
export async function putoauthServerAdminAccessTokensId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerAccessToken.IUpdate;
}): Promise<IOauthServerAccessToken> {
  const { admin, id, body } = props;

  const existing = await MyGlobal.prisma.oauth_server_access_tokens.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error(`OAuth access token not found for ID: ${id}`);
  }

  const updated = await MyGlobal.prisma.oauth_server_access_tokens.update({
    where: { id },
    data: {
      oauth_client_id: body.oauth_client_id ?? undefined,
      authorization_code_id: body.authorization_code_id ?? undefined,
      token: body.token ?? undefined,
      scope: body.scope ?? undefined,
      expires_at: body.expires_at ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    oauth_client_id: updated.oauth_client_id as string & tags.Format<"uuid">,
    authorization_code_id: updated.authorization_code_id ?? null,
    token: updated.token,
    scope: updated.scope,
    expires_at: toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
