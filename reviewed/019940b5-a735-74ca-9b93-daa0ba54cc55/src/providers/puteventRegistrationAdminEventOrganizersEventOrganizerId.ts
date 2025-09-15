import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update event organizer data
 *
 * This operation updates an existing event organizer's information identified
 * by their unique ID. It accepts update data such as full name, phone number,
 * profile picture URL, and email verification status.
 *
 * Security permissions allow only admins to update event organizers
 * system-wide. The eventOrganizerId path parameter is required and validated as
 * a UUID.
 *
 * The update modifies the event_registration_event_organizers table record and
 * returns the updated organizer data after applying changes.
 *
 * @param props - Object containing the admin payload, event organizer ID, and
 *   update body
 * @param props.admin - The authenticated admin performing the update
 * @param props.eventOrganizerId - Unique UUID of the event organizer to update
 * @param props.body - Update data for the event organizer
 * @returns The updated event organizer record
 * @throws {Error} When the event organizer is not found
 */
export async function puteventRegistrationAdminEventOrganizersEventOrganizerId(props: {
  admin: AdminPayload;
  eventOrganizerId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventOrganizer.IUpdate;
}): Promise<IEventRegistrationEventOrganizer> {
  const { admin, eventOrganizerId, body } = props;

  const now = toISOStringSafe(new Date());

  try {
    const updated =
      await MyGlobal.prisma.event_registration_event_organizers.update({
        where: { id: eventOrganizerId },
        data: {
          email: body.email ?? undefined,
          password_hash: body.password_hash ?? undefined,
          full_name: body.full_name ?? undefined,
          phone_number:
            body.phone_number === undefined ? undefined : body.phone_number,
          profile_picture_url:
            body.profile_picture_url === undefined
              ? undefined
              : body.profile_picture_url,
          email_verified: body.email_verified ?? undefined,
          updated_at: now,
        },
      });

    return {
      id: updated.id,
      email: updated.email,
      password_hash: updated.password_hash,
      full_name: updated.full_name,
      phone_number: updated.phone_number ?? null,
      profile_picture_url: updated.profile_picture_url ?? null,
      email_verified: updated.email_verified,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  } catch {
    throw new Error(`Event organizer with id ${eventOrganizerId} not found`);
  }
}
