import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update capacity override for an event
 *
 * Authorized admin users can update an existing capacity override setting for a
 * specific event. This allows toggling whether automatic capacity adjustments
 * are overridden by manual controls. The function validates that the capacity
 * override exists for the given event and updates the override flag
 * accordingly.
 *
 * @param props - Object containing all parameters needed for this operation
 * @param props.admin - Authenticated admin performing the update
 * @param props.eventId - UUID of the event the capacity override belongs to
 * @param props.eventCapacityOverrideId - UUID of the capacity override record
 *   to update
 * @param props.body - Request body containing the new is_override_enabled
 *   boolean flag
 * @returns Updated capacity override record with current timestamps
 * @throws {Error} When capacity override does not belong to the specified event
 * @throws {Error} When capacity override record is not found
 */
export async function puteventRegistrationAdminEventsEventIdCapacityOverridesEventCapacityOverrideId(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  eventCapacityOverrideId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventCapacityOverride.IUpdate;
}): Promise<IEventRegistrationEventCapacityOverride> {
  const { admin, eventId, eventCapacityOverrideId, body } = props;

  const found =
    await MyGlobal.prisma.event_registration_event_capacity_overrides.findUniqueOrThrow(
      {
        where: { id: eventCapacityOverrideId },
      },
    );

  if (found.event_id !== eventId) {
    throw new Error("Event ID does not match capacity override record");
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.event_registration_event_capacity_overrides.update({
      where: { id: eventCapacityOverrideId },
      data: {
        is_override_enabled: body.is_override_enabled,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    event_id: updated.event_id,
    is_override_enabled: updated.is_override_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
