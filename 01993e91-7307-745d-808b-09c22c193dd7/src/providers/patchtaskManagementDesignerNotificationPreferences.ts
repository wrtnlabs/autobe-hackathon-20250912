import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Search notification preferences with filtering and pagination for Designer
 * role.
 *
 * Allows a designer user to query their notification preferences based on
 * filters such as preference_key, delivery_method, and enabled flag. Supports
 * pagination with page and limit parameters.
 *
 * @param props - Object containing authenticated designer and request body with
 *   filters.
 * @param props.designer - Authenticated designer payload.
 * @param props.body - Filter and pagination criteria for notification
 *   preferences.
 * @returns Paginated list of notification preferences matching filters.
 * @throws {Error} Throws if any unexpected error occurs during database access.
 */
export async function patchtaskManagementDesignerNotificationPreferences(props: {
  designer: DesignerPayload;
  body: ITaskManagementNotificationPreferences.IRequest;
}): Promise<IPageITaskManagementNotificationPreferences> {
  const { designer, body } = props;

  const page_ = body.page ?? 1;
  const limit_ = body.limit ?? 10;

  const page = Number(page_);
  const limit = Number(limit_);
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    user_id: string & tags.Format<"uuid">;
    preference_key?: string;
    enabled?: boolean;
    delivery_method?: string;
  } = {
    deleted_at: null,
    user_id: designer.id,
  };

  if (body.preference_key !== undefined && body.preference_key !== null) {
    where.preference_key = body.preference_key;
  }
  if (body.enabled !== undefined && body.enabled !== null) {
    where.enabled = body.enabled;
  }
  if (body.delivery_method !== undefined && body.delivery_method !== null) {
    where.delivery_method = body.delivery_method;
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.task_management_notification_preferences.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.task_management_notification_preferences.count({ where }),
  ]);

  const resultData = data.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    preference_key: item.preference_key,
    enabled: item.enabled,
    delivery_method: item.delivery_method,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: resultData,
  };
}
