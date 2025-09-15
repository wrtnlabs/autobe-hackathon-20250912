import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Search and retrieve a filtered, paginated list of event attendees.
 *
 * This operation supports filtering by event ID, regular user ID, and creation
 * timestamp. Results are ordered by creation timestamp descending.
 *
 * Authorization: Requires an authorized eventOrganizer.
 *
 * @param props - Contains eventOrganizer credentials and search filter with
 *   pagination.
 * @param props.eventOrganizer - Authenticated event organizer.
 * @param props.body - Search filters and pagination parameters.
 * @returns Paginated list of event attendee summaries matching the search
 *   criteria.
 * @throws {Error} When underlying database operations fail.
 */
export async function patcheventRegistrationEventOrganizerEventAttendees(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationEventAttendee.IRequest;
}): Promise<IPageIEventRegistrationEventAttendee.ISummary> {
  const { eventOrganizer, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where: {
    event_id?: string & tags.Format<"uuid">;
    regular_user_id?: string & tags.Format<"uuid">;
    created_at?: string & tags.Format<"date-time">;
  } = {};

  if (body.event_id !== undefined && body.event_id !== null) {
    where.event_id = body.event_id;
  }
  if (body.regular_user_id !== undefined && body.regular_user_id !== null) {
    where.regular_user_id = body.regular_user_id;
  }
  if (body.created_at !== undefined && body.created_at !== null) {
    where.created_at = body.created_at;
  }

  const skip = (page - 1) * limit;

  const [attendees, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_attendees.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.event_registration_event_attendees.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: attendees.map((a) => ({
      id: a.id,
      event_id: a.event_id,
      regular_user_id: a.regular_user_id,
      created_at: toISOStringSafe(a.created_at),
    })),
  };
}
