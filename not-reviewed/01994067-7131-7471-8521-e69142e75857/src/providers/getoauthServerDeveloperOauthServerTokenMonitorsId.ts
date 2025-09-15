import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Get detailed information of a specific OAuth token monitor event.
 *
 * This operation retrieves a token monitor record by its ID, including event
 * type, timestamps, client IP address, user agent, and related OAuth client and
 * access token IDs. Access is restricted to developers (authorization assumed
 * externally).
 *
 * @param props - Object containing developer payload and token monitor event ID
 * @param props.developer - The authenticated developer making the request
 * @param props.id - UUID of the token monitor event
 * @returns The detailed OAuth token monitor event information
 * @throws {Error} Throws if token monitor event not found
 */
export async function getoauthServerDeveloperOauthServerTokenMonitorsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerTokenMonitor> {
  const { developer, id } = props;

  const record =
    await MyGlobal.prisma.oauth_server_token_monitors.findUniqueOrThrow({
      where: { id },
      include: {
        accessToken: { select: { id: true } },
        oauthClient: { select: { id: true } },
      },
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
