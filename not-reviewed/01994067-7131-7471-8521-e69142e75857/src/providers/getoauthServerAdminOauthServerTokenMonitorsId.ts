import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information of a specific OAuth token monitor event.
 *
 * This function retrieves the OAuth server token monitor record by its unique
 * ID. It returns event details including event type, timestamps, client IP
 * address, user agent, and related OAuth client and access token IDs.
 *
 * Only administrators are authorized to access this information.
 *
 * @param props - The properties object containing:
 *
 *   - Admin: The authenticated admin user making the request.
 *   - Id: UUID of the token monitor event to retrieve.
 *
 * @returns The OAuth server token monitor record details.
 * @throws {Error} Throws if the record with the given ID does not exist.
 */
export async function getoauthServerAdminOauthServerTokenMonitorsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerTokenMonitor> {
  const { admin, id } = props;

  const record =
    await MyGlobal.prisma.oauth_server_token_monitors.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    access_token_id: record.access_token_id,
    oauth_client_id: record.oauth_client_id,
    event_type: record.event_type,
    event_timestamp: toISOStringSafe(record.event_timestamp),
    ip_address: record.ip_address,
    user_agent: record.user_agent ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
