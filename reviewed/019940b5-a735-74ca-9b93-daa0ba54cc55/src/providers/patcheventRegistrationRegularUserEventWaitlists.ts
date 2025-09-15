import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Search and retrieve paginated event waitlists.
 *
 * This operation searches the event_registration_event_waitlists table for
 * entries filtered optionally by event_id and/or regular_user_id. Pagination is
 * supported via page and limit parameters, defaulting to page 1 and limit 10.
 *
 * Authorization requires the caller to have the 'regularUser' role.
 *
 * @param props - The props object containing regularUser payload and request
 *   body.
 * @param props.regularUser - The authenticated regular user making the request.
 * @param props.body - The filtering and pagination request body according to
 *   IEventRegistrationEventWaitlist.IRequest.
 * @returns A paginated summary list of event waitlist entries matching the
 *   filters.
 * @throws {Error} Throws error on database access failure.
 */
export async function patcheventRegistrationRegularUserEventWaitlists(props: {
  regularUser: RegularuserPayload;
  body: IEventRegistrationEventWaitlist.IRequest;
}): Promise<IPageIEventRegistrationEventWaitlist.ISummary> {
  const { body } = props;

  // Default pagination params
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build where clause conditionally
  const where: {
    event_id?: string & tags.Format<"uuid">;
    regular_user_id?: string & tags.Format<"uuid">;
  } = {};

  if (body.event_id !== undefined && body.event_id !== null) {
    where.event_id = body.event_id;
  }
  if (body.regular_user_id !== undefined && body.regular_user_id !== null) {
    where.regular_user_id = body.regular_user_id;
  }

  // Query data and total count concurrently
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.event_registration_event_waitlists.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_event_waitlists.count({ where }),
  ]);

  // Map results to summary DTO
  const data = rows.map((r) => ({
    id: r.id,
    event_id: r.event_id,
    regular_user_id: r.regular_user_id,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: count,
      pages: Math.ceil(count / limit),
    },
    data,
  };
}
