import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves a paginated and filtered list of notification preferences for the
 * authenticated PMO user.
 *
 * This endpoint accepts optional filters for preference_key, delivery_method,
 * and enabled status, along with pagination parameters page and limit.
 *
 * @param props - Object containing PMO payload and filtering request body
 * @param props.pmo - Authenticated PMO user's payload with user id
 * @param props.body - Filtering and pagination criteria
 * @returns A paginated list of notification preferences matching the filters
 * @throws {Error} When database operations fail or invalid pagination
 */
export async function patchtaskManagementPmoNotificationPreferences(props: {
  pmo: PmoPayload;
  body: ITaskManagementNotificationPreferences.IRequest;
}): Promise<IPageITaskManagementNotificationPreferences> {
  const { pmo, body } = props;

  // Default pagination values with safe fallback
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 10;
  const skip = (page - 1) * limit;

  // Construct where clause with conditional filters
  const where = {
    user_id: pmo.id,
    deleted_at: null,
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
  };

  // Execute count and findMany queries concurrently
  const [total, results] = await Promise.all([
    MyGlobal.prisma.task_management_notification_preferences.count({ where }),
    MyGlobal.prisma.task_management_notification_preferences.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  // Map results to API response type with proper date conversion
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: results.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      user_id: r.user_id as string & tags.Format<"uuid">,
      preference_key: r.preference_key,
      enabled: r.enabled,
      delivery_method: r.delivery_method,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
  };
}
