import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequests";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieves detailed information for a single event organizer request by its
 * unique ID.
 *
 * This operation is used by admins and event organizers to view the full
 * details of a specific organizer status request submitted by a regular user.
 * Authorization is expected to be handled externally.
 *
 * @param props - Object containing the authenticated event organizer and the ID
 *   of the organizer request to retrieve
 * @param props.eventOrganizer - The authenticated event organizer making the
 *   request
 * @param props.organizerRequestId - UUID string identifying the organizer
 *   request
 * @returns The detailed organizer request information
 * @throws Throws if no organizer request with the given ID is found
 */
export async function geteventRegistrationEventOrganizerOrganizerRequestsOrganizerRequestId(props: {
  eventOrganizer: EventOrganizerPayload;
  organizerRequestId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationOrganizerRequests> {
  const { organizerRequestId } = props;

  const record =
    await MyGlobal.prisma.event_registration_organizer_requests.findUniqueOrThrow(
      {
        where: { id: organizerRequestId },
      },
    );

  return {
    id: record.id,
    user_id: record.user_id,
    status: record.status,
    reason: record.reason ?? null,
    admin_comment: record.admin_comment ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
