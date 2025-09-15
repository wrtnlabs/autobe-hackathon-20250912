import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieves a filtered and paginated list of waitlisted users for a specified
 * event.
 *
 * This endpoint allows event organizers or admins to view the waitlist entries
 * for an event they manage. Filters include event ID (path parameter) and
 * optionally regular user ID. Pagination is supported via page and limit query
 * parameters.
 *
 * @param props - Object containing authenticated event organizer, eventId path
 *   parameter, and request body with filtering and pagination parameters.
 * @param props.eventOrganizer - The authenticated event organizer.
 * @param props.eventId - UUID of the event to retrieve waitlists for.
 * @param props.body - Filtering and pagination options.
 * @returns Paginated list of waitlist summary records.
 * @throws Errors if database operations fail or input is invalid.
 */
export async function patcheventRegistrationEventOrganizerEventsEventIdWaitlists(props: {
  eventOrganizer: EventOrganizerPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IRequest;
}): Promise<IPageIEventRegistrationEventWaitlist.ISummary> {
  const { eventOrganizer, eventId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    event_id: string & tags.Format<"uuid">;
    regular_user_id?: string & tags.Format<"uuid">;
  } = {
    event_id: eventId,
  };

  if (body.regular_user_id !== undefined && body.regular_user_id !== null) {
    where.regular_user_id = body.regular_user_id;
  }

  const [waitlists, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_waitlists.findMany({
      where,
      orderBy: { created_at: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.event_registration_event_waitlists.count({ where }),
  ]);

  const data = waitlists.map((wl) => ({
    id: wl.id,
    event_id: wl.event_id,
    regular_user_id: wl.regular_user_id,
    created_at: toISOStringSafe(wl.created_at),
    updated_at: toISOStringSafe(wl.updated_at),
  }));

  const pages = Math.max(Math.ceil(total / limit), 1);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages,
    },
    data,
  };
}
