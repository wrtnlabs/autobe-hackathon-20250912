import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRefreshToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Updates an existing OAuth refresh token identified by its UUID.
 *
 * Allows modification of token string, scopes, expiration time, and optionally
 * the linked authorization code.
 *
 * Only authenticated members can perform this operation.
 *
 * @param props - Object containing the authenticated member, the refresh token
 *   ID, and the update data payload.
 * @param props.member - The authenticated member performing the update.
 * @param props.id - The UUID of the refresh token to update.
 * @param props.body - The update payload containing optional fields to modify.
 * @returns The updated OAuth refresh token details with all timestamps
 *   formatted as ISO 8601 strings.
 * @throws {Error} If the refresh token with the specified ID does not exist.
 */
export async function putoauthServerMemberRefreshTokensId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerRefreshToken.IUpdate;
}): Promise<IOauthServerRefreshToken> {
  const { member, id, body } = props;

  // Retrieve the existing refresh token
  const existing = await MyGlobal.prisma.oauth_server_refresh_tokens.findUnique(
    { where: { id } },
  );
  if (!existing) throw new Error(`Refresh token with id ${id} not found`);

  // Prepare the update data
  const data = {
    oauth_client_id: body.oauth_client_id ?? undefined,
    authorization_code_id:
      body.authorization_code_id === null
        ? null
        : (body.authorization_code_id ?? undefined),
    token: body.token ?? undefined,
    scope: body.scope ?? undefined,
    expires_at: body.expires_at ?? undefined,
    deleted_at:
      body.deleted_at === null ? null : (body.deleted_at ?? undefined),
  };

  // Perform the update
  const updated = await MyGlobal.prisma.oauth_server_refresh_tokens.update({
    where: { id },
    data,
  });

  // Return updated token with date fields converted to ISO string
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
