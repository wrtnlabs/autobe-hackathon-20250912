import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update details of an existing OAuth token monitor event by its ID.
 *
 * This endpoint allows modification of event metadata such as event type, event
 * timestamp, IP address, user agent, and soft deletion timestamp. Only users
 * with the 'admin' role are authorized to perform this operation.
 *
 * @param props - Object containing the admin payload, token monitor ID, and the
 *   body with update fields.
 * @param props.admin - Authenticated admin performing the update.
 * @param props.id - UUID of the token monitor event to update.
 * @param props.body - Partial update data for the token monitor event.
 * @returns The updated OAuth server token monitor record.
 * @throws {Error} If the token monitor record with given ID does not exist.
 * @throws {Error} If the user is unauthorized (handled before this function).
 */
export async function putoauthServerAdminOauthServerTokenMonitorsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerTokenMonitor.IUpdate;
}): Promise<IOauthServerTokenMonitor> {
  const { admin, id, body } = props;

  // Verify token monitor record exists
  const existing =
    await MyGlobal.prisma.oauth_server_token_monitors.findUniqueOrThrow({
      where: { id },
    });

  // Prepare update data, assign only provided fields
  const updateData: IOauthServerTokenMonitor.IUpdate = {};

  if (body.access_token_id !== undefined)
    updateData.access_token_id = body.access_token_id;
  if (body.oauth_client_id !== undefined)
    updateData.oauth_client_id = body.oauth_client_id;
  if (body.event_type !== undefined) updateData.event_type = body.event_type;
  if (body.event_timestamp !== undefined)
    updateData.event_timestamp = body.event_timestamp;
  if (body.ip_address !== undefined) updateData.ip_address = body.ip_address;
  if (body.user_agent !== undefined)
    updateData.user_agent = body.user_agent ?? null;
  if (body.deleted_at !== undefined)
    updateData.deleted_at = body.deleted_at ?? null;

  const updated = await MyGlobal.prisma.oauth_server_token_monitors.update({
    where: { id },
    data: updateData,
  });

  // Map and return updated record fields, with ISO date strings
  return {
    id: updated.id,
    access_token_id: updated.access_token_id,
    oauth_client_id: updated.oauth_client_id,
    event_type: updated.event_type,
    event_timestamp: updated.event_timestamp as string &
      tags.Format<"date-time">,
    ip_address: updated.ip_address,
    user_agent: updated.user_agent ?? null,
    created_at: updated.created_at as string & tags.Format<"date-time">,
    updated_at: updated.updated_at as string & tags.Format<"date-time">,
    deleted_at: updated.deleted_at ?? null,
  };
}
