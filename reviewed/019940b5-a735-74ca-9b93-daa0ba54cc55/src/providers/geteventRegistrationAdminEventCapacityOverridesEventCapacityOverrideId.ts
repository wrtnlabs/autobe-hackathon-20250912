import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get event capacity override detail by ID
 *
 * Fetches a detailed event capacity override record identified by the given
 * eventCapacityOverrideId. This includes the event association, override
 * enablement flag, and audit timestamps.
 *
 * Accessible only by admins. Throws if no matching record is found.
 *
 * @param props - Object containing the admin payload and the unique ID of the
 *   event capacity override
 * @param props.admin - The authenticated admin performing the operation
 * @param props.eventCapacityOverrideId - The UUID of the event capacity
 *   override record
 * @returns The detailed event capacity override data matching the ID
 * @throws {Error} Throws if no event capacity override record with the given ID
 *   exists
 */
export async function geteventRegistrationAdminEventCapacityOverridesEventCapacityOverrideId(props: {
  admin: AdminPayload;
  eventCapacityOverrideId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventCapacityOverride> {
  const { eventCapacityOverrideId } = props;

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
