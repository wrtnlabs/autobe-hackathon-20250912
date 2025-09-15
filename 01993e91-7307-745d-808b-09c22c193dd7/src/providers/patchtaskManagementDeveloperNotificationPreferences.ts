import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves paginated and filtered notification preferences for the
 * authenticated developer.
 *
 * This operation allows a developer to search their notification preferences by
 * preference key, delivery method, and enabled status, with pagination.
 *
 * Only notification preferences owned by the requesting developer are returned.
 *
 * @param props - Object containing the authenticated developer and filter
 *   criteria
 * @param props.developer - Authenticated developer performing the request
 * @param props.body - Filter criteria including preference key, delivery
 *   method, enabled flag, page number, and page limit
 * @returns Paginated list of notification preferences matching the search
 *   criteria
 * @throws {Error} Throws if database query fails or unexpected errors occur
 */
export async function patchtaskManagementDeveloperNotificationPreferences(props: {
  developer: DeveloperPayload;
  body: ITaskManagementNotificationPreferences.IRequest;
}): Promise<IPageITaskManagementNotificationPreferences> {
  const { developer, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where = {
    user_id: developer.id,
    ...(body.preference_key !== undefined &&
      body.preference_key !== null && {
        preference_key: body.preference_key,
      }),
    ...(body.enabled !== undefined &&
      body.enabled !== null && {
        enabled: body.enabled,
      }),
    ...(body.delivery_method !== undefined &&
      body.delivery_method !== null && {
        delivery_method: body.delivery_method,
      }),
    deleted_at: null,
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.task_management_notification_preferences.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.task_management_notification_preferences.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((rec) => ({
      id: rec.id,
      user_id: rec.user_id,
      preference_key: rec.preference_key,
      enabled: rec.enabled,
      delivery_method: rec.delivery_method,
      created_at: toISOStringSafe(rec.created_at),
      updated_at: toISOStringSafe(rec.updated_at),
      deleted_at: rec.deleted_at ? toISOStringSafe(rec.deleted_at) : null,
    })),
  };
}
