import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCapacityOverrides } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverrides";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get event capacity override details by ID
 *
 * Retrieves detailed information for a specific event capacity override record
 * identified by the eventCapacityOverrideId parameter. This is for
 * administrative use only and requires admin authentication.
 *
 * @param props - Object containing admin payload and eventCapacityOverrideId
 * @param props.admin - Authenticated admin making the request
 * @param props.eventCapacityOverrideId - UUID of the event capacity override
 *   record
 * @returns The event capacity override details matching the given ID
 * @throws {Error} Throws if no record found with the given
 *   eventCapacityOverrideId
 */
export async function geteventRegistrationAdminEventsEventIdCapacityOverridesEventCapacityOverrideId(props: {
  admin: AdminPayload;
  eventCapacityOverrideId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventCapacityOverrides> {
  const { admin, eventCapacityOverrideId } = props;

  const record =
    await MyGlobal.prisma.event_registration_event_capacity_overrides.findUniqueOrThrow(
      {
        where: { id: eventCapacityOverrideId },
      },
    );

  return {
    id: record.id,
    event_id: record.event_id,
    is_override_enabled: record.is_override_enabled,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
