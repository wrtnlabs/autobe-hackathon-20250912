import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing OAuth authorization code record by ID.
 *
 * This operation updates mutable fields such as oauth_client_id, data,
 * redirect_uri, expires_at, and deleted_at of the authorization code record
 * identified by the given ID. Immutable fields like code and created_at remain
 * unchanged to preserve audit trail and protocol integrity.
 *
 * @param props - Object containing admin authentication, ID parameter, and
 *   update body
 * @param props.admin - Authenticated admin payload performing the update
 * @param props.id - UUID of the authorization code to update
 * @param props.body - Partial update of mutable fields for the authorization
 *   code
 * @returns The updated authorization code record with all fields and timestamps
 * @throws {Error} Throws if the authorization code with given ID does not exist
 */
export async function putoauthServerAdminAuthorizationCodesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerAuthorizationCode.IUpdate;
}): Promise<IOauthServerAuthorizationCode> {
  const { admin, id, body } = props;

  // Retrieve existing record or throw error if not found
  const existing =
    await MyGlobal.prisma.oauth_server_authorization_codes.findUniqueOrThrow({
      where: { id },
    });

  // Prepare data for update, only mutable fields included
  const data: IOauthServerAuthorizationCode.IUpdate = {};
  if (body.oauth_client_id !== undefined)
    data.oauth_client_id = body.oauth_client_id;
  if (body.data !== undefined) data.data = body.data;
  if (body.redirect_uri !== undefined) data.redirect_uri = body.redirect_uri;
  if (body.expires_at !== undefined) data.expires_at = body.expires_at;
  if (body.deleted_at !== undefined) data.deleted_at = body.deleted_at;

  // Update the updated_at field to current timestamp
  data.updated_at = toISOStringSafe(new Date());

  // Perform the update operation
  const updated = await MyGlobal.prisma.oauth_server_authorization_codes.update(
    {
      where: { id },
      data,
    },
  );

  // Return the updated record with date fields converted to ISO strings
  return {
    id: updated.id,
    oauth_client_id: updated.oauth_client_id,
    code: updated.code,
    data: updated.data,
    redirect_uri: updated.redirect_uri,
    expires_at: toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
