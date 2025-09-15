import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete event capacity override by ID
 *
 * Permanently deletes an event capacity override record identified by the
 * provided UUID. This operation disables manual override capacity adjustments
 * for the event. Only accessible by administrators with valid credentials.
 *
 * @param props - Object containing admin authentication and target override ID
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.eventCapacityOverrideId - UUID of the event capacity override to
 *   delete
 * @returns {Promise<void>} No content upon successful deletion
 * @throws {Error} Throws if no record with the specified ID exists
 */
export async function deleteeventRegistrationAdminEventCapacityOverridesEventCapacityOverrideId(props: {
  admin: AdminPayload;
  eventCapacityOverrideId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, eventCapacityOverrideId } = props;

  await MyGlobal.prisma.event_registration_event_capacity_overrides.delete({
    where: {
      id: eventCapacityOverrideId,
    },
  });
}
