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
 * Retrieve paginated list of event attendee summaries for a specific regular
 * user.
 *
 * This operation returns paginated summary records filtered by the regular user
 * ID. It supports optional filtering by event_id, regular_user_id, and
 * created_at timestamp.
 *
 * @param props - Object containing admin authentication, target regularUserId,
 *   and filter/pagination body
 * @param props.admin - Authenticated admin making the request
 * @param props.regularUserId - Regular user UUID path parameter to filter
 *   attendees
 * @param props.body - Request body with optional filters and pagination
 *   controls
 * @returns Paginated summary of event attendees
 * @throws {Error} When Prisma query fails or invalid input
 */
export async function patcheventRegistrationAdminRegularUsersRegularUserIdAttendees(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IRequest;
}): Promise<IPageIEventRegistrationEventAttendee.ISummary> {
  const { admin, regularUserId, body } = props;

  // Use default pagination if not provided
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where condition
  const whereCondition = {
    regular_user_id: regularUserId,
    ...(body.event_id !== undefined &&
      body.event_id !== null && { event_id: body.event_id }),
    ...(body.regular_user_id !== undefined &&
      body.regular_user_id !== null && {
        regular_user_id: body.regular_user_id,
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
  };

  // Perform parallel queries for results and count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_attendees.findMany({
      where: whereCondition,
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
      where: whereCondition,
    }),
  ]);

  // Return structured paginated results
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((record) => ({
      id: record.id,
      event_id: record.event_id,
      regular_user_id: record.regular_user_id,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
