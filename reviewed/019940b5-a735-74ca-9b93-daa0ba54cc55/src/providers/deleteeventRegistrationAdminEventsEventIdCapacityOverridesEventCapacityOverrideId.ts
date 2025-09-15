import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete capacity override for an event
 *
 * Allows authorized admin users to permanently delete a capacity override
 * linked to a given event. Removes the override completely from the database,
 * causing the event to revert to default automatic capacity behavior.
 *
 * @param props - Object containing the admin credentials and identifiers
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.eventId - UUID of the event associated with the capacity
 *   override
 * @param props.eventCapacityOverrideId - UUID of the capacity override record
 *   to delete
 * @returns Void
 * @throws {Error} Throws if the capacity override record does not exist or if
 *   any database error occurs
 */
export async function deleteeventRegistrationAdminEventsEventIdCapacityOverridesEventCapacityOverrideId(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  eventCapacityOverrideId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, eventId, eventCapacityOverrideId } = props;

  // Verify the capacity override record exists for the given event
  await MyGlobal.prisma.event_registration_event_capacity_overrides.findFirstOrThrow(
    {
      where: {
        id: eventCapacityOverrideId,
        event_id: eventId,
      },
    },
  );

  // Delete the capacity override record
  await MyGlobal.prisma.event_registration_event_capacity_overrides.delete({
    where: {
      id: eventCapacityOverrideId,
    },
  });
}
