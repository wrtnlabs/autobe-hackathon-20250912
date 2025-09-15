import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve paginated list of event attendee summaries for the authenticated
 * regular user.
 *
 * This operation allows a regular user to fetch their own event attendance
 * records with optional filtering.
 *
 * @param props - Object containing authenticated regularUser info, target
 *   regularUserId, and request filters.
 * @param props.regularUser - Authenticated regular user payload.
 * @param props.regularUserId - UUID of the regular user whose attendees are
 *   requested.
 * @param props.body - Request body with pagination and filtering parameters.
 * @returns A paginated list of event attendee summaries matching the filters.
 * @throws {Error} Throws when the authenticated user tries to access records
 *   for other users.
 */
export async function patcheventRegistrationRegularUserRegularUsersRegularUserIdAttendees(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventAttendee.IRequest;
}): Promise<IPageIEventRegistrationEventAttendee.ISummary> {
  const { regularUser, regularUserId, body } = props;

  if (regularUser.id !== regularUserId) {
    throw new Error(
      "Unauthorized: You can only access your own attendee records.",
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereConditions: {
    regular_user_id: string & tags.Format<"uuid">;
    event_id?: string & tags.Format<"uuid">;
    created_at?: string & tags.Format<"date-time">;
  } = {
    regular_user_id: regularUserId,
  };

  if (body.event_id !== undefined && body.event_id !== null) {
    whereConditions.event_id = body.event_id;
  }
  if (body.created_at !== undefined && body.created_at !== null) {
    whereConditions.created_at = body.created_at;
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_attendees.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_event_attendees.count({
      where: whereConditions,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    regular_user_id: row.regular_user_id,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
