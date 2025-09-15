import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List attendees for a specific event.
 *
 * Retrieves a paginated list of attendees registered for the event with the
 * given ID. Supports pagination, filtering by regular user ID and creation
 * date. Requires admin authentication.
 *
 * @param props - Object containing admin credentials, event ID, and request
 *   filters
 * @param props.admin - Authenticated admin making the request
 * @param props.eventId - UUID of the event
 * @param props.body - Filter and pagination criteria
 * @returns A paginated summary of event attendees
 * @throws {Error} If database queries fail
 */
export async function patcheventRegistrationAdminEventsEventIdAttendees(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IRequest;
}): Promise<IPageIEventRegistrationEventAttendee.ISummary> {
  const { admin, eventId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereConditions = {
    event_id: eventId,
    ...(body.regular_user_id !== undefined &&
      body.regular_user_id !== null && {
        regular_user_id: body.regular_user_id,
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && {
        created_at: body.created_at,
      }),
  };

  const [attendees, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_attendees.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.event_registration_event_attendees.count({
      where: whereConditions,
    }),
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
