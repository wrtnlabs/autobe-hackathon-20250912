import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific event organizer
 *
 * This endpoint fetches the complete information about an event organizer
 * identified by the given UUID. Access is restricted to admin users only.
 *
 * @param props - Object containing admin payload and event organizer ID
 * @param props.admin - Authenticated admin making the request
 * @param props.eventOrganizerId - UUID of the event organizer to retrieve
 * @returns The event organizer's detailed information
 * @throws {Error} When the event organizer is not found
 */
export async function geteventRegistrationAdminEventOrganizersEventOrganizerId(props: {
  admin: AdminPayload;
  eventOrganizerId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventOrganizer> {
  const { admin, eventOrganizerId } = props;

  // Retrieve the event organizer from the database by ID
  const organizer =
    await MyGlobal.prisma.event_registration_event_organizers.findUniqueOrThrow(
      {
        where: { id: eventOrganizerId },
      },
    );

  // Return the organizer data conforming to IEventRegistrationEventOrganizer interface
  return {
    id: organizer.id as string & tags.Format<"uuid">,
    email: organizer.email,
    password_hash: organizer.password_hash,
    full_name: organizer.full_name,
    phone_number: organizer.phone_number ?? null,
    profile_picture_url: organizer.profile_picture_url ?? null,
    email_verified: organizer.email_verified,
    created_at: toISOStringSafe(organizer.created_at),
    updated_at: toISOStringSafe(organizer.updated_at),
  };
}
