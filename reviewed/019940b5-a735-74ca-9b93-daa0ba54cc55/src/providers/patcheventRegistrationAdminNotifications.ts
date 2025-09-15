import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { IPageIEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve filtered paginated notifications list for event registration admin.
 *
 * This operation allows an authenticated admin user to retrieve a paginated
 * list of event registration notifications. Supports filtering by read status,
 * searching by notification type or content, and pagination controls.
 *
 * @param props - Object containing admin payload and request filter criteria.
 * @param props.admin - Authenticated admin payload for authorization.
 * @param props.body - Filtering and pagination request criteria.
 * @returns Paginated summary list of notifications.
 * @throws {Error} Throws on database access or unexpected failures.
 */
export async function patcheventRegistrationAdminNotifications(props: {
  admin: AdminPayload;
  body: IEventRegistrationNotification.IRequest;
}): Promise<IPageIEventRegistrationNotification.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = page * limit;

  const whereConditions = {
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
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_notifications.count({
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
    data: notifications.map((n) => ({
      id: n.id as string & tags.Format<"uuid">,
      user_id:
        n.user_id ??
        (undefined as (string & tags.Format<"uuid">) | undefined | null),
      type: n.type,
      content: n.content,
      read: n.read,
      created_at: toISOStringSafe(n.created_at),
      updated_at: toISOStringSafe(n.updated_at),
      deleted_at: n.deleted_at ? toISOStringSafe(n.deleted_at) : null,
    })),
  };
}
