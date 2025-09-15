import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCapacityOverrides } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverrides";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update event capacity override by ID.
 *
 * This operation updates the capacity override settings for a specific event.
 * Capacity overrides are administrative controls allowing manual enablement or
 * disablement of automatic adjustments to event capacity. By updating the
 * is_override_enabled flag, administrators can override the system's dynamic
 * capacity adjustment behavior for the identified event.
 *
 * This operation requires authentication with appropriate administrative roles
 * as capacity override settings impact event management globally. It operates
 * on the event_registration_event_capacity_overrides database table.
 *
 * @param props - Object containing the admin payload, the
 *   eventCapacityOverrideId path parameter, and the request body with the
 *   updated is_override_enabled flag
 * @param props.admin - The authenticated admin making the request
 * @param props.eventCapacityOverrideId - UUID of the event capacity override to
 *   update
 * @param props.body - Request body containing is_override_enabled flag
 * @returns Updated event capacity override object
 * @throws {Error} If the event capacity override record does not exist
 */
export async function puteventRegistrationAdminEventCapacityOverridesEventCapacityOverrideId(props: {
  admin: AdminPayload;
  eventCapacityOverrideId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventCapacityOverrides.IUpdate;
}): Promise<IEventRegistrationEventCapacityOverrides> {
  const { admin, eventCapacityOverrideId, body } = props;

  // Update the record with new is_override_enabled flag and current timestamp
  const updated =
    await MyGlobal.prisma.event_registration_event_capacity_overrides.update({
      where: { id: eventCapacityOverrideId },
      data: {
        is_override_enabled: body.is_override_enabled,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Map dates explicitly using toISOStringSafe to conform with string & tags.Format<'date-time'>
  return {
    id: updated.id,
    event_id: updated.event_id,
    is_override_enabled: updated.is_override_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
