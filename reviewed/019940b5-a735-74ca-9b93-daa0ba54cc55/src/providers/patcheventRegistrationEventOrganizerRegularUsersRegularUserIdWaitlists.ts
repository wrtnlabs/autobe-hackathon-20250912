import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

export async function patcheventRegistrationEventOrganizerRegularUsersRegularUserIdWaitlists(props: {
  eventOrganizer: EventOrganizerPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IRequest;
}): Promise<IPageIEventRegistrationEventWaitlist.ISummary> {
  const { eventOrganizer, regularUserId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    regular_user_id: string & tags.Format<"uuid">;
    event_id?: string & tags.Format<"uuid">;
  } = {
    regular_user_id: regularUserId,
  };

  if (body.event_id !== undefined && body.event_id !== null) {
    where.event_id = body.event_id;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_waitlists.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_event_waitlists.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((entry) => ({
      id: entry.id,
      event_id: entry.event_id,
      regular_user_id: entry.regular_user_id,
      created_at: toISOStringSafe(entry.created_at),
      updated_at: toISOStringSafe(entry.updated_at),
    })),
  };
}
