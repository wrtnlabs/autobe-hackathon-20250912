import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Create a new OAuth token monitor event record.
 *
 * This function creates a token monitor event in the database, recording
 * details such as the access token involved, OAuth client, event type,
 * timestamps, IP address, user agent, and soft delete status.
 *
 * The developer parameter ensures that only authenticated developers can
 * perform this operation.
 *
 * @param props - Object containing the developer payload and creation data
 * @param props.developer - The authenticated developer performing the operation
 * @param props.body - Data for creating the OAuth token monitor event
 * @returns The created OAuth token monitor event record with all fields
 * @throws {Error} Throws on database errors or constraint violations
 */
export async function postoauthServerDeveloperOauthServerTokenMonitors(props: {
  developer: DeveloperPayload;
  body: IOauthServerTokenMonitor.ICreate;
}): Promise<IOauthServerTokenMonitor> {
  const { developer, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_token_monitors.create({
    data: {
      id,
      access_token_id: body.access_token_id,
      oauth_client_id: body.oauth_client_id,
      event_type: body.event_type,
      event_timestamp: body.event_timestamp,
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
