import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Searches notification preferences for the authenticated PM user with
 * filtering and pagination.
 *
 * This operation allows a PM user to retrieve their notification preferences
 * filtered by preference key, delivery method, and enabled status, with
 * pagination support.
 *
 * @param props - Object containing authenticated PM user and search request
 * @param props.pm - The authenticated PM user's payload, ensuring authorization
 * @param props.body - The request body containing filter criteria and
 *   pagination options
 * @returns Paginated list of notification preferences matching the search
 *   criteria
 * @throws {Error} When database access fails or parameters are invalid
 */
export async function patchtaskManagementPmNotificationPreferences(props: {
  pm: PmPayload;
  body: ITaskManagementNotificationPreferences.IRequest;
}): Promise<IPageITaskManagementNotificationPreferences> {
  const { pm, body } = props;

  // Default page and limit validation with safe fallback
  const page =
    body.page !== undefined && body.page !== null && body.page >= 1
      ? body.page
      : (1 as number & tags.Type<"int32"> & tags.Minimum<0>);

  const limit =
    body.limit !== undefined && body.limit !== null && body.limit >= 1
      ? body.limit
      : (10 as number & tags.Type<"int32"> & tags.Minimum<0>);

  const skip = (page - 1) * limit;

  // Compose where condition for filters, always user_id equals pm.id
  const where = {
    user_id: pm.id,
    deleted_at: null,
    ...(body.preference_key !== undefined &&
      body.preference_key !== null && { preference_key: body.preference_key }),
    ...(body.enabled !== undefined &&
      body.enabled !== null && { enabled: body.enabled }),
    ...(body.delivery_method !== undefined &&
      body.delivery_method !== null && {
        delivery_method: body.delivery_method,
      }),
  };

  // Run queries in parallel: data and total count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.task_management_notification_preferences.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),

    MyGlobal.prisma.task_management_notification_preferences.count({ where }),
  ]);

  // Format results with date fields to ISO strings
  const formattedData = data.map((item) => ({
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
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: formattedData,
  };
}
