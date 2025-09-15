import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an event attendee record for a given regular user and attendee ID.
 *
 * This function allows an admin to update attendance details which may include
 * event ID, user ID, and timestamps while ensuring strict type safety and
 * schema validation.
 *
 * @param props - Object containing admin auth, regular user ID, event attendee
 *   ID, and update body.
 * @param props.admin - Authenticated admin performing the update.
 * @param props.regularUserId - UUID of the regular user associated with the
 *   attendee.
 * @param props.eventAttendeeId - UUID of the event attendee record to update.
 * @param props.body - Partial update data conforming to
 *   IEventRegistrationEventAttendee.IUpdate.
 * @returns The updated event attendee record.
 * @throws {Error} Throws if the specified attendee record does not exist.
 */
export async function puteventRegistrationAdminRegularUsersRegularUserIdAttendeesEventAttendeeId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  eventAttendeeId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IUpdate;
}): Promise<IEventRegistrationEventAttendee> {
  const { admin, regularUserId, eventAttendeeId, body } = props;

  // Ensure the record exists with matching regularUserId and eventAttendeeId
  const attendee =
    await MyGlobal.prisma.event_registration_event_attendees.findFirstOrThrow({
      where: {
        id: eventAttendeeId,
        regular_user_id: regularUserId,
      },
    });

  // Prepare update data from body, conditionally including keys
  const data: {
    event_id?: string | null;
    regular_user_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } = {};

  if ("event_id" in body) {
    data.event_id = body.event_id === null ? null : body.event_id;
  }
  if ("regular_user_id" in body) {
    data.regular_user_id =
      body.regular_user_id === null ? null : body.regular_user_id;
  }
  if ("created_at" in body) {
    data.created_at = body.created_at === null ? null : body.created_at;
  }
  if ("updated_at" in body) {
    data.updated_at = body.updated_at === null ? null : body.updated_at;
  }

  // Perform the update operation
  const updated =
    await MyGlobal.prisma.event_registration_event_attendees.update({
      where: { id: eventAttendeeId },
      data,
    });

  // Return response with correct type branding and date string conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    event_id: updated.event_id as string & tags.Format<"uuid">,
    regular_user_id: updated.regular_user_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
