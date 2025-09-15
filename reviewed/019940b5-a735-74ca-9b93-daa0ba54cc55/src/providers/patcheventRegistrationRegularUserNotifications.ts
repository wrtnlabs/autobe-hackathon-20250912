import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { IPageIEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationNotification";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve filtered and paginated notifications for authenticated regular user.
 *
 * This endpoint allows a regular user to fetch their notifications related to
 * event registrations, including registration confirmations, waitlist
 * promotions, event schedule changes, and capacity adjustments. Supports
 * filtering by read status and search terms, with pagination and sorting by
 * creation date descending.
 *
 * @param props - Object containing the authenticated regular user and
 *   filter/pagination criteria
 * @param props.regularUser - Authenticated regular user payload
 * @param props.body - Filtering, sorting, and pagination criteria for
 *   notifications
 * @returns Paginated summary list of notifications matching criteria
 * @throws {Error} When database query fails or other unexpected errors occur
 */
export async function patcheventRegistrationRegularUserNotifications(props: {
  regularUser: RegularuserPayload;
  body: IEventRegistrationNotification.IRequest;
}): Promise<IPageIEventRegistrationNotification.ISummary> {
  const { regularUser, body } = props;

  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;

  const whereCondition = {
    deleted_at: null,
    user_id: regularUser.id,
    ...(body.read !== undefined && body.read !== null && { read: body.read }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { type: { contains: body.search } },
          { content: { contains: body.search } },
        ],
      }),
  };

  const [notifications, totalCount] = await Promise.all([
    MyGlobal.prisma.event_registration_notifications.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_notifications.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: notifications.map((notification) => ({
      id: notification.id,
      user_id: notification.user_id === null ? null : notification.user_id,
      type: notification.type,
      content: notification.content,
      read: notification.read,
      created_at: toISOStringSafe(notification.created_at),
      updated_at: toISOStringSafe(notification.updated_at),
      deleted_at:
        notification.deleted_at === null
          ? null
          : toISOStringSafe(notification.deleted_at),
    })),
  };
}
