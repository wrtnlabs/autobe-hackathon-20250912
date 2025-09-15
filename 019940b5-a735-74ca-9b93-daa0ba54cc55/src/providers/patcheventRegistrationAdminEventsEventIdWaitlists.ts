import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Searches and retrieves a paginated list of waitlisted entries for a specific
 * event.
 *
 * This operation supports filtering by regular user ID and paginates results
 * ordered by creation timestamp in FIFO order. Accessible to authorized admin
 * users only.
 *
 * @param props - The input properties containing the admin user, event ID, and
 *   search criteria.
 * @param props.admin - The authenticated admin performing the request.
 * @param props.eventId - The UUID of the event whose waitlist is queried.
 * @param props.body - The request body containing pagination and filtering
 *   parameters.
 * @returns A paginated summary of waitlist entries matching the criteria.
 * @throws {Error} Throws if the Prisma query operations fail.
 */
export async function patcheventRegistrationAdminEventsEventIdWaitlists(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IRequest;
}): Promise<IPageIEventRegistrationEventWaitlist.ISummary> {
  const { admin, eventId, body } = props;

  // Default pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Construct Prisma where conditions
  const whereConditions = {
    event_id: eventId,
    ...(body.regular_user_id !== undefined &&
      body.regular_user_id !== null && {
        regular_user_id: body.regular_user_id,
      }),
  };

  // Fetch paginated waitlist entries and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_waitlists.findMany({
      where: whereConditions,
      orderBy: { created_at: "asc" }, // FIFO order
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_event_waitlists.count({
      where: whereConditions,
    }),
  ]);

  // Return the paginated summary with proper ISO string conversion
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
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
