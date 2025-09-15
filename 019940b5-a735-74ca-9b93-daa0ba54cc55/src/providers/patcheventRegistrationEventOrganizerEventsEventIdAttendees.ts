import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

export async function patcheventRegistrationEventOrganizerEventsEventIdAttendees(props: {
  eventOrganizer: EventOrganizerPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IRequest;
}): Promise<IPageIEventRegistrationEventAttendee.ISummary> {
  const { eventOrganizer, eventId, body } = props;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const event = await MyGlobal.prisma.event_registration_events.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  if (!event) {
    throw new Error("Unauthorized");
  }

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

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_attendees.findMany({
      where: whereConditions,
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
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      event_id: item.event_id as string & tags.Format<"uuid">,
      regular_user_id: item.regular_user_id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
