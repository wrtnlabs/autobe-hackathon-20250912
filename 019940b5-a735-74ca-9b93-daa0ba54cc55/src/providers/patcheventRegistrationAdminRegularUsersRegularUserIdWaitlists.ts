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
 * Retrieve paginated waitlist entries for a specific regular user.
 *
 * This endpoint is accessible by admin users to view the waitlist entries
 * associated with the given regular user ID.
 *
 * Pagination, filtering by event ID, and sorting by creation date descending
 * are supported.
 *
 * @param props - The input properties for the operation
 * @param props.admin - The authenticated admin user performing the request
 * @param props.regularUserId - The UUID of the regular user whose waitlist
 *   entries are requested
 * @param props.body - The request body containing filtering and pagination
 *   criteria
 * @returns A paginated summary of waitlist entries for the specified regular
 *   user
 * @throws {Error} When database operations fail or parameters are invalid
 */
export async function patcheventRegistrationAdminRegularUsersRegularUserIdWaitlists(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IRequest;
}): Promise<IPageIEventRegistrationEventWaitlist.ISummary> {
  const page = (props.body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.Type<"uint32">;
  const limit = (props.body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.Type<"uint32">;

  const whereConditions = {
    regular_user_id: props.regularUserId,
    ...(props.body.event_id !== undefined &&
      props.body.event_id !== null && {
        event_id: props.body.event_id,
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_waitlists.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_event_waitlists.count({
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
    data: results.map((entry) => ({
      id: entry.id,
      event_id: entry.event_id,
      regular_user_id: entry.regular_user_id,
      created_at: toISOStringSafe(entry.created_at),
      updated_at: toISOStringSafe(entry.updated_at),
    })),
  };
}
