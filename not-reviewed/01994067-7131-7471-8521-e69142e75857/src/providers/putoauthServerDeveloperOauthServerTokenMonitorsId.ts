import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update an existing OAuth token monitor event record by its ID.
 *
 * This function updates fields such as event_type, event_timestamp, ip_address,
 * user_agent, and deleted_at. It ensures the record exists, performs the
 * update, and returns the updated record with properly formatted date-time
 * strings.
 *
 * @param props - Properties including the authenticated developer, event ID,
 *   and update data
 * @param props.developer - The authenticated developer performing the update
 * @param props.id - Unique ID of the OAuth token monitor event
 * @param props.body - Update data for the token monitor event
 * @returns The updated token monitor event record
 * @throws {Error} If the token monitor event with specified ID does not exist
 */
export async function putoauthServerDeveloperOauthServerTokenMonitorsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerTokenMonitor.IUpdate;
}): Promise<IOauthServerTokenMonitor> {
  const { developer, id, body } = props;

  const found = await MyGlobal.prisma.oauth_server_token_monitors.findUnique({
    where: { id },
  });

  if (!found) throw new Error("Token monitor event not found");

  const updated = await MyGlobal.prisma.oauth_server_token_monitors.update({
    where: { id },
    data: {
      access_token_id: body.access_token_id ?? undefined,
      oauth_client_id: body.oauth_client_id ?? undefined,
      event_type: body.event_type ?? undefined,
      event_timestamp: body.event_timestamp ?? undefined,
      ip_address: body.ip_address ?? undefined,
      user_agent:
        body.user_agent === null ? null : (body.user_agent ?? undefined),
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    access_token_id: updated.access_token_id as string & tags.Format<"uuid">,
    oauth_client_id: updated.oauth_client_id as string & tags.Format<"uuid">,
    event_type: updated.event_type,
    event_timestamp: toISOStringSafe(updated.event_timestamp),
    ip_address: updated.ip_address,
    user_agent: updated.user_agent ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
