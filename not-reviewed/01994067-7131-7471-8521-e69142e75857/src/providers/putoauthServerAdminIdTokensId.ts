import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerIdToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing opaque OpenID Connect ID token record in the OAuth server.
 *
 * This operation updates the token string, expiration timestamp, and related
 * fields. Only authorized admins can perform this update.
 *
 * @param props - Object containing admin info, ID token ID, and update body
 * @param props.admin - The authenticated admin performing the update
 * @param props.id - UUID of the ID token to update
 * @param props.body - Partial update data for the ID token
 * @returns The updated ID token record
 * @throws {Error} When the ID token record does not exist
 */
export async function putoauthServerAdminIdTokensId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerIdToken.IUpdate;
}): Promise<IOauthServerIdToken> {
  const { admin, id, body } = props;

  // Ensure the ID token exists
  await MyGlobal.prisma.oauth_server_id_tokens.findUniqueOrThrow({
    where: { id },
  });

  // Prepare update data, converting date strings where necessary
  const updated = await MyGlobal.prisma.oauth_server_id_tokens.update({
    where: { id },
    data: {
      oauth_client_id: body.oauth_client_id ?? undefined,
      authorization_code_id: body.authorization_code_id ?? undefined,
      token: body.token ?? undefined,
      expires_at: body.expires_at
        ? toISOStringSafe(body.expires_at)
        : undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return converted updated record
  return {
    id: updated.id,
    oauth_client_id: updated.oauth_client_id,
    authorization_code_id: updated.authorization_code_id ?? null,
    token: updated.token,
    expires_at: toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
