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
 * Retrieves paginated event waitlist summaries for a specific regular user.
 *
 * This function allows a regular user to query their own waitlist entries with
 * optional filtering by event ID, supporting pagination with page and limit
 * parameters.
 *
 * Authorization: Only the regular user themselves can query their waitlist
 * entries.
 *
 * @param props - Contains the authenticated regular user payload, the requested
 *   regular user ID, and the request body with filters and pagination.
 * @param props.regularUser - Authenticated regular user information.
 * @param props.regularUserId - The UUID of the regular user whose waitlist
 *   entries are queried.
 * @param props.body - The request body containing optional filters and
 *   pagination settings.
 * @returns A paginated summary list of waitlist entries matching the filter
 *   criteria.
 * @throws {Error} If the user tries to query waitlist entries for another user.
 */
export async function patcheventRegistrationRegularUserRegularUsersRegularUserIdWaitlists(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEventWaitlist.IRequest;
}): Promise<IPageIEventRegistrationEventWaitlist.ISummary> {
  const { regularUser, regularUserId, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  if (
    body.regular_user_id !== undefined &&
    body.regular_user_id !== null &&
    body.regular_user_id !== regularUserId
  ) {
    throw new Error("Unauthorized: Cannot query waitlists of other users");
  }

  const whereCondition = {
    regular_user_id: regularUserId,
    ...(body.event_id !== undefined &&
      body.event_id !== null && { event_id: body.event_id }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_waitlists.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        event_id: true,
        regular_user_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.event_registration_event_waitlists.count({
      where: whereCondition,
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
      id: item.id,
      event_id: item.event_id,
      regular_user_id: item.regular_user_id,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
