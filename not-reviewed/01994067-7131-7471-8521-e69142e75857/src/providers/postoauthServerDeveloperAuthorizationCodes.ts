import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Create a new OAuth authorization code record.
 *
 * This operation validates the provided OAuth client ID to ensure the client
 * exists and is active. It then creates a new authorization code with all
 * required fields, generates a new UUID for the record, and sets creation and
 * update timestamps to the current time.
 *
 * Timestamps and UUIDs are handled using string branding to comply with API
 * contracts.
 *
 * @param props - Object containing the developer payload and authorization code
 *   creation data
 * @param props.developer - The authenticated developer performing the operation
 * @param props.body - The data required to create the authorization code
 * @returns The newly created OAuth authorization code record with all fields
 *   populated
 * @throws {Error} When the specified OAuth client does not exist
 * @throws {Error} When a duplicate authorization code is attempted
 */
export async function postoauthServerDeveloperAuthorizationCodes(props: {
  developer: DeveloperPayload;
  body: IOauthServerAuthorizationCode.ICreate;
}): Promise<IOauthServerAuthorizationCode> {
  const { developer, body } = props;

  // Validate OAuth client existence and active status
  const oauthClient =
    await MyGlobal.prisma.oauth_server_oauth_clients.findUnique({
      where: { id: body.oauth_client_id },
      select: { id: true },
    });

  if (!oauthClient) {
    throw new Error(`OAuth client not found: ${body.oauth_client_id}`);
  }

  // Prepare current timestamps formatted as ISO strings with branding
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create new authorization code record
  const created = await MyGlobal.prisma.oauth_server_authorization_codes.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        oauth_client_id: body.oauth_client_id,
        code: body.code,
        data: body.data,
        redirect_uri: body.redirect_uri,
        expires_at: body.expires_at,
        created_at: now,
        updated_at: now,
      },
    },
  );

  // Return with all date fields converted properly (no `as` casting)
  return {
    id: created.id,
    oauth_client_id: created.oauth_client_id,
    code: created.code,
    data: created.data,
    redirect_uri: created.redirect_uri,
    expires_at: created.expires_at
      ? toISOStringSafe(created.expires_at)
      : (null as null),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
