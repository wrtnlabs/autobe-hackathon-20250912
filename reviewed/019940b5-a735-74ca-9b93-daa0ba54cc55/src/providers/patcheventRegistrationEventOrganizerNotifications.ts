import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { IPageIEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationNotification";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieve filtered and paginated notifications for an authenticated event
 * organizer.
 *
 * This endpoint fetches notifications such as registration confirmations,
 * waitlist promotions, event schedule changes, and capacity adjustments.
 *
 * Supports filtering by read status and search terms on notification type and
 * content. Pagination parameters page and limit control the returned results.
 *
 * @param props - The properties object containing the authenticated event
 *   organizer and filter/request body
 * @param props.eventOrganizer - The authenticated event organizer payload
 * @param props.body - The request body with filtering and pagination criteria
 * @returns A paginated summary list of notifications matching the criteria
 * @throws {Error} If database queries fail or unexpected errors occur
 */
export async function patcheventRegistrationEventOrganizerNotifications(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationNotification.IRequest;
}): Promise<IPageIEventRegistrationNotification.ISummary> {
  const { eventOrganizer, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.read !== undefined && body.read !== null && { read: body.read }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { type: { contains: body.search } },
          { content: { contains: body.search } },
        ],
      }),
  };

  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.event_registration_notifications.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        type: true,
        content: true,
        read: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.event_registration_notifications.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: notifications.map((n) => ({
      id: n.id,
      user_id: n.user_id ?? null,
      type: n.type,
      content: n.content,
      read: n.read,
      created_at: toISOStringSafe(n.created_at),
      updated_at: toISOStringSafe(n.updated_at),
      deleted_at: n.deleted_at ? toISOStringSafe(n.deleted_at) : null,
    })),
  };
}
