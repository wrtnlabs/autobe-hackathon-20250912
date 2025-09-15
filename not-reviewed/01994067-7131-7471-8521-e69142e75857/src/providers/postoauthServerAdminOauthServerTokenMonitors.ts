import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new OAuth token monitor event record.
 *
 * This function logs access token events such as validation, expiration, or
 * revocation. It requires an authenticated admin user and records details about
 * the event, including token references, event type, client IP, user agent, and
 * timestamps.
 *
 * @param props - The parameters including admin auth info and event data.
 * @param props.admin - The authenticated admin payload.
 * @param props.body - The token monitor event creation data.
 * @returns The newly created OAuth token monitor event record.
 * @throws {Error} If the database operation fails or required fields are
 *   missing.
 */
export async function postoauthServerAdminOauthServerTokenMonitors(props: {
  admin: AdminPayload;
  body: IOauthServerTokenMonitor.ICreate;
}): Promise<IOauthServerTokenMonitor> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_token_monitors.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      access_token_id: body.access_token_id,
      oauth_client_id: body.oauth_client_id,
      event_type: body.event_type,
      event_timestamp: toISOStringSafe(body.event_timestamp),
      ip_address: body.ip_address,
      user_agent: body.user_agent ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    access_token_id: created.access_token_id,
    oauth_client_id: created.oauth_client_id,
    event_type: created.event_type,
    event_timestamp: toISOStringSafe(created.event_timestamp),
    ip_address: created.ip_address,
    user_agent: created.user_agent ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
