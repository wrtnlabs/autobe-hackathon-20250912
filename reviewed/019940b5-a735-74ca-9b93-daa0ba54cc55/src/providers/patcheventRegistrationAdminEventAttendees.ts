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
 * Search and retrieve a filtered, paginated list of event attendees.
 *
 * This operation retrieves event attendees matching the given filters,
 * supporting pagination for admin management dashboards.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 * @param props.body - The filtering and pagination criteria
 * @returns A paginated summary of event attendees
 * @throws {Error} When the database query fails
 */
export async function patcheventRegistrationAdminEventAttendees(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventAttendee.IRequest;
}): Promise<IPageIEventRegistrationEventAttendee.ISummary> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.event_id !== undefined &&
      body.event_id !== null && {
        event_id: body.event_id,
      }),
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
      where,
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
        created_at: true,
      },
      skip,
      take: limit,
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
    data: results.map((item) => ({
      id: item.id,
      event_id: item.event_id,
      regular_user_id: item.regular_user_id,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
