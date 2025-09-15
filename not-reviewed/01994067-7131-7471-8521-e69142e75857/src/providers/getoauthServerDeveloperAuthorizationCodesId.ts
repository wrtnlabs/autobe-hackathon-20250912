import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Get detailed OAuth authorization code by ID
 *
 * This function retrieves OAuth authorization code information by its unique
 * identifier from the database. It returns all relevant fields including the
 * OAuth client association, code, expiration time, and soft deletion status.
 *
 * Access to this operation requires the developer role, provided in the props.
 *
 * @param props - Object containing the developer payload and the authorization
 *   code ID
 * @param props.developer - The authenticated developer making the request
 * @param props.id - UUID string of the authorization code to retrieve
 * @returns The full OAuth authorization code record
 * @throws {Error} If the authorization code with the specified ID does not
 *   exist
 */
export async function getoauthServerDeveloperAuthorizationCodesId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerAuthorizationCode> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.oauth_server_authorization_codes.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    oauth_client_id: record.oauth_client_id,
    code: record.code,
    data: record.data,
    redirect_uri: record.redirect_uri,
    expires_at: toISOStringSafe(record.expires_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
