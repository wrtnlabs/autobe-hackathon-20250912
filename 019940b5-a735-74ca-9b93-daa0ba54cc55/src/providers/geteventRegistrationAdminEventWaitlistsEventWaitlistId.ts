import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific event waitlist entry.
 *
 * This operation fetches the detailed information of a waitlist entry by its
 * unique ID. It returns the event ID, the regular user ID, and timestamps of
 * creation and update.
 *
 * Only administrators can perform this operation.
 *
 * @param props - Object containing the admin payload and the eventWaitlistId
 *   parameter.
 * @param props.admin - The authenticated admin performing the operation.
 * @param props.eventWaitlistId - The UUID of the event waitlist entry to
 *   retrieve.
 * @returns The detailed waitlist entry matching the given ID.
 * @throws {Error} Throws if the waitlist entry is not found.
 */
export async function geteventRegistrationAdminEventWaitlistsEventWaitlistId(props: {
  admin: AdminPayload;
  eventWaitlistId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventWaitlist> {
  const { admin, eventWaitlistId } = props;

  const record =
    await MyGlobal.prisma.event_registration_event_waitlists.findUniqueOrThrow({
      where: { id: eventWaitlistId },
    });

  return {
    id: record.id,
    event_id: record.event_id,
    regular_user_id: record.regular_user_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
