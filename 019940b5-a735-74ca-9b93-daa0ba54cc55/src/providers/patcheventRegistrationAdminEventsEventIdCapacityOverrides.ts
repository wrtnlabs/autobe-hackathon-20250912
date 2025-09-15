import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IPageIEventRegistrationEventCapacityOverrides } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventCapacityOverrides";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List capacity overrides for an event
 *
 * Retrieves all capacity override records associated with a specific event from
 * the event_registration_event_capacity_overrides table. This allows clients to
 * view manual override settings for an event, facilitating administrative
 * transparency and capacity management.
 *
 * Access to this endpoint requires administrative authorization due to the
 * sensitivity of override settings.
 *
 * @param props - Object containing admin authentication and eventId UUID
 * @param props.admin - Authenticated admin performing the operation
 * @param props.eventId - UUID string identifying the event
 * @returns Paginated list of capacity overrides for the specified event
 * @throws {Error} Throws if any database or authorization error occurs
 */
export async function patcheventRegistrationAdminEventsEventIdCapacityOverrides(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
}): Promise<IPageIEventRegistrationEventCapacityOverrides> {
  const { admin, eventId } = props;

  const results =
    await MyGlobal.prisma.event_registration_event_capacity_overrides.findMany({
      where: { event_id: eventId },
    });

  const total =
    await MyGlobal.prisma.event_registration_event_capacity_overrides.count({
      where: { event_id: eventId },
    });

  return {
    pagination: {
      current: 1,
      limit: results.length,
      records: total,
      pages: 1,
    },
    data: results.map((item) => ({
      id: item.id,
      event_id: item.event_id,
      is_override_enabled: item.is_override_enabled,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
